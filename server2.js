// 환경 변수 설정
const dotenv = require('dotenv').config();

// 기본 모듈 임포트
const path = require('path');
const express = require('express');
const sha = require('sha256');
const multer = require('multer');


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

// 쿠키 및 세션 미들웨어 등록 (cookieParser 다음에 추가)
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
    app.use('/', require('./routes/auth.js')(mydb));
    
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


app.get('/content/:id', checkLogin, function(req, res) {
    const postId = req.params.id;

    const objectId = new ObjectId(postId);

    if (!ObjectId.isValid(postId)) {
        return res.status(400).send("유효하지 않은 ID입니다.");
    }

    mydb.collection("post").findOne({ _id: objectId })
    .then((result) => {
        if (!result) {
            return res.status(404).send("게시글을 찾을 수 없습니다.");
        }
        res.render('content.ejs', { data: result });
    })
    .catch((err) => {
        console.log("게시글 조회 실패", err);
        res.status(500).send("서버 오류로 게시글을 불러오지 못했습니다.");
    });
});

app.post("/delete", function(req, res) {
    console.log(req.body._id);
    req.body._id = new ObjectId(req.body._id);

    mydb.collection("post").deleteOne({ _id: req.body._id })
    .then((result) => {
        console.log("삭제 완료");
        res.send("삭제 성공");
    }).catch((err) => {
        console.log("삭제 실패", err);
        res.status(500).send("삭제 중 오류 발생");
    });
});

app.get("/edit/:id", checkLogin, function(req, res) {
    const postId = req.params.id;
    
    if (!ObjectId.isValid(postId)) {
        return res.status(400).send("유효하지 않은 ID입니다.");
    }
    
    const objectId = new ObjectId(postId);

    mydb.collection("post").findOne({ _id: objectId })
    .then((result) => {
        if (!result) {
            return res.status(404).send("게시글을 찾을 수 없습니다.");
        }
        console.log("조회완료", result);
        res.render('edit.ejs', { data: result });
    })
    .catch((err) => {
        console.error("게시글 조회 실패", err);
        res.status(500).send("서버 오류로 게시글을 불러오지 못했습니다.");
    });
});

app.post("/edit", function(req, res) {
    console.log("수정 요청 데이터:", req.body);
    
    const postId = req.body._id;
    
    console.log("받은 ID 값:", postId);
    
    if (!postId || !ObjectId.isValid(postId)) {
        console.log("유효하지 않은 ID:", postId);
        return res.status(400).send("유효하지 않은 ID 값입니다.");
    }

    const objectId = new ObjectId(postId);

    mydb.collection("post").updateOne(
        { _id: objectId },
        { $set: {
            title: req.body.title, 
            content: req.body.content, 
            date: req.body.someDate
        }}
    ).then((result) => {
        console.log("수정 결과:", result);
        
        if (result.matchedCount === 0) {
            return res.status(404).send("해당 게시글을 찾을 수 없습니다.");
        }
        
        res.redirect("/list");
    }).catch((err) => {
        console.error("데이터 수정 실패", err);
        res.status(500).send("데이터 수정 중 오류 발생");
    });
});

app.get('/cookie', function(req, res) {
    let milk = parseInt(req.signedCookies.milk) || 0;
    milk += 1000;

    res.cookie('milk', milk, { signedmaxAge: 3600000, httpOnly: true });
    res.send("product : " + milk + "원");
});

app.get('/session', function(req, res) {
    if (isNaN(req.session.milk)) {
        req.session.milk = 0;
    }
    req.session.milk += 1000;
    res.send("product : " + req.session.milk + "원");
});

app.get("/login", function(req, res) {
    if (req.session.userid) {
        console.log("세션 유지");
        res.render("index.ejs", { user: req.session.userid });
    } else {
        res.render("login.ejs");
    }
});

app.post("/login", function(req, res) {
    mydb.collection("account").findOne({ userid: req.body.userid }).then((result) => {
        if (!result) {
            return res.send("로그인 실패: 아이디가 존재하지 않습니다.");
        } 
        
        const hashedInputPassword = sha(req.body.userpw);
        
        if (result.userpw === hashedInputPassword) {
            req.session.userid = req.body.userid;
            
            if (req.body.rememberMe === 'on') {
                const autoLoginToken = sha(result.userid + new Date().getTime());
                
                mydb.collection("account").updateOne(
                    { _id: result._id },
                    { $set: { autoLoginToken: autoLoginToken } }
                );
                
                res.cookie('autoLoginToken', autoLoginToken, { 
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                    signed: true
                });
            }
            
            req.session.save(function(err) {
                if (err) {
                    console.error("세션 저장 오류:", err);
                    return res.status(500).send("세션 저장 중 오류 발생");
                }
                res.redirect("/index");
            });
        } else {
            res.send("로그인 실패: 비밀번호가 틀립니다.");
        }
    }).catch((err) => {
        console.error("DB 조회 중 오류 발생:", err);
        res.status(500).send("서버 오류 발생");
    });
});

app.get("/logout", function(req, res) {
    console.log("로그아웃");
    
    const userid = req.session.userid;
    
    req.session.destroy();
    
    res.clearCookie('autoLoginToken');
    
    if (userid) {
        mydb.collection("account").updateOne(
            { userid: userid },
            { $unset: { autoLoginToken: "" } }
        ).catch(err => {
            console.error("토큰 삭제 중 오류:", err);
        });
    }
    
    res.redirect("/");
});

app.get("/signup", function(req, res) {
    res.render("signup.ejs");
});

app.post("/signup", function(req, res) {
    console.log(req.body.userid);
    console.log(req.body.userpw);
    console.log(req.body.useremail);
    
    mydb.collection("account").findOne({ userid: req.body.userid })
    .then((existingUser) => {
        if (existingUser) {
            return res.send("<script>alert('이미 존재하는 아이디입니다.'); window.location.href='/';</script>");
        }

        const hashedPassword = sha(req.body.userpw);
        
        mydb.collection("account").insertOne({
            userid: req.body.userid,
            userpw: hashedPassword,
            useremail: req.body.useremail,
        }).then((result) => {
            console.log("회원가입 성공", result);
            res.send("<script>alert('회원가입이 완료되었습니다.'); window.location.href='/';</script>");
        }).catch(err => {
            console.error("회원가입 실패", err);
            res.status(500).send("회원가입 중 오류 발생");
        });
    }).catch(err => {
        console.error("DB 조회 중 오류 발생:", err);
        res.status(500).send("서버 오류 발생");
    });
});

const storage = multer.diskStorage({
    destination: function(req, file, done) {
        done(null, './public/image');
    },
    filename: function(req, file, done) {
        done(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

app.post('/photo', upload.single('picture'), function(req, res) {
    console.log("서버에 파일 첨부:", req.file.path);
    imagepath = "/image/" + req.file.filename;
    console.log("이미지 경로 설정:", imagepath);
});

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
