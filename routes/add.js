const express = require('express');
const router = express.Router();
const multer = require('multer');

// 로그인 체크 함수
function checkLogin(req, res, next) {
    if (!req.session.userid) {
        return res.redirect("/login");
    }
    next();
}

// multer의 storage 설정
const storage = multer.diskStorage({
    destination: function(req, file, done) {
        done(null, './public/image'); // 파일을 저장할 경로 설정
    },
    filename: function(req, file, done) {
        done(null, file.originalname); // 파일 이름을 원래 이름으로 저장
    }
});

// multer 미들웨어 설정 (storage와 연결)
const upload = multer({ storage: storage });

module.exports = function(db) {
    
    // 글 작성 페이지 라우트
    router.get('/enter', checkLogin, function(req, res) {
        res.render('enter.ejs');
    });

    // 글 저장 라우트
    router.post('/save', function(req, res) {
        console.log(req.body.title);
        console.log(req.body.content);
        console.log("imagepath:", req.app.locals.imagepath || "이미지 없음");
        
        db.collection("post").insertOne({
            title: req.body.title, 
            content: req.body.content, 
            date: req.body.someDate,
            path: req.app.locals.imagepath || ""
        }).then((result) => {
            console.log("저장완료", result);
            req.app.locals.imagepath = undefined; // 이미지 경로 초기화
            res.redirect('/list');
        }).catch((err) => {
            console.error("데이터 저장 실패", err);
            res.status(500).send("데이터 저장 중 오류 발생");
        });
    });

    // 사진 업로드 라우트
    router.post('/photo', upload.single('picture'), function(req, res) {
        if (req.file) {
            console.log("서버에 파일 첨부:", req.file.path);
            req.app.locals.imagepath = "/image/" + req.file.filename; // 이미지 경로 설정
            console.log("이미지 경로 설정:", req.app.locals.imagepath);
        } else {
            res.status(400).send("파일 업로드 실패");
        }
    });
    

    return router;
};
