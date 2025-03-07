// 환경 변수 설정
const dotenv = require('dotenv').config();

// 기본 모듈 임포트
const path = require('path');
const express = require('express');
const multer = require('multer');
const sha = require('sha256');


// mongoDB 관련 모듈
const mongoclient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const url = process.env.DB_URL;

// express 초기화
const app = express();

 // 데이터베이스 객체 참조변수 선언
let mydb;
let imagepath = '';

// body-parser 라이브러리(미들웨어) 추가
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// 쿠키 및 세션 미들웨어 등록
let cookieParser = require('cookie-parser');
app.use(cookieParser('ncvka0e39842kpfd'));

const session = require('express-session');
app.use(session({
    secret: 'dkufe8938493j4e08349u',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30일로 설정
    }
}));


// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoclient.connect(url).then((client) => {
    mydb = client.db('myboard');
    console.log("✅ MongoDB 연결 성공!");

    // 라우터 모듈에 전달
    app.use('/', require('./routes/post.js')(mydb));
    app.use('/', require('./routes/add.js')(mydb));
    app.use('/', require('./routes/auth2.js')(mydb));
    
    app.listen(process.env.PORT, function() {
        console.log("🚀 서버가 포트 8080에서 실행 중...");
    });
}).catch((err) => {
    console.error("❌ DB 접속 오류:", err);
});

// 자동 로그인 체크 미들웨어
app.use(function(req, res, next) {
    // 이미 로그인된 경우 다음 미들웨어로 진행
    if (req.session.userid) {
        return next();
    }
    
    // 자동 로그인 토큰이 있는지 확인
    const autoLoginToken = req.signedCookies.autoLoginToken;
    if (!autoLoginToken) {
        return next();
    }
    
    // 토큰으로 사용자 찾기
    mydb.collection("account").findOne({ autoLoginToken: autoLoginToken })
    .then((user) => {
        if (user) {
            // 사용자를 찾았으면 세션에 저장
            req.session.userid = user.userid;
            console.log("자동 로그인 성공:", user.userid);
        }
        next();
    })
    .catch((err) => {
        console.error("자동 로그인 처리 중 오류:", err);
        next();
    });
});

// 로그인 체킹 미들웨어
function checkLogin(req, res, next) {
    console.log("세션 확인:", req.session);
    if (!req.session.userid) {
        console.log("로그인 필요: 세션에 userid 없음");
        return res.redirect("/login");
    }
    console.log("로그인 확인됨:", req.session.userid);
    next();
}

app.get('/', function(req, res) {
    res.render('login.ejs');  // index.ejs 렌더링
});

app.get('/index', checkLogin, function(req, res) {
    res.render('index.ejs', { user: req.session.userid });  // index.ejs 렌더링
});

app.use(express.static(path.join(__dirname, 'public'))); // 이게 / 보다 아래로 와야한다.



app.get('/search', function(req, res) {
    const searchQuery = req.query.value;

    if (!searchQuery) {
        return res.redirect('/list');
    }

    mydb.collection('post').find({ title: { $regex: searchQuery, $options: 'i' } }).toArray().then((result) => {
        console.log("검색 결과:", result);
        res.render('sresult.ejs', { data: result, searchQuery: searchQuery });
    }).catch((err) => {
        console.error("❌ 검색 실패:", err);
        res.status(500).send("데이터 조회 중 오류 발생");
    });
});
