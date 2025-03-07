const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = function(db) {
    const router = express.Router();

    function checkLogin(req, res, next) {
        console.log("세션 확인:", req.session);
        if (!req.session.userid) {
            console.log("로그인 필요: 세션에 userid 없음");
            return res.redirect("/login");
        }
        console.log("로그인 확인됨:", req.session.userid);
        next();
    }
    
    // 게시글 목록 가져오기
    router.get("/list", (req, res) => {
        db.collection("post").find().toArray()
            .then((result) => {
                console.log(result);
                res.render('list.ejs', { data: result });
            })
            .catch((err) => {
                console.error("❌ 데이터 조회 실패:", err);
                res.status(500).send("데이터 조회 중 오류 발생");
            });
    });

    router.post("/delete", function(req, res) {
        console.log(req.body._id);
        req.body._id = new ObjectId(req.body._id);
    
        db.collection("post").deleteOne({ _id: req.body._id })
        .then((result) => {
            console.log("삭제 완료");
            res.send("삭제 성공");
        }).catch((err) => {
            console.log("삭제 실패", err);
            res.status(500).send("삭제 중 오류 발생");
        });
    });

    router.get('/content/:id', checkLogin, function(req, res) {
        const postId = req.params.id;
    
        if (!ObjectId.isValid(postId)) {
            return res.status(400).send("유효하지 않은 ID입니다.");
        }
        
        const objectId = new ObjectId(postId);
    
        db.collection("post").findOne({ _id: objectId })
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
    
    router.get("/edit/:id", checkLogin, function(req, res) {
        const postId = req.params.id;
        
        if (!ObjectId.isValid(postId)) {
            return res.status(400).send("유효하지 않은 ID입니다.");
        }
        
        const objectId = new ObjectId(postId);
    
        db.collection("post").findOne({ _id: objectId })
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

    router.post("/edit", function(req, res) {
        console.log("수정 요청 데이터:", req.body);
        
        const postId = req.body._id;
        
        console.log("받은 ID 값:", postId);
        
        if (!postId || !ObjectId.isValid(postId)) {
            console.log("유효하지 않은 ID:", postId);
            return res.status(400).send("유효하지 않은 ID 값입니다.");
        }
    
        const objectId = new ObjectId(postId);
    
        db.collection("post").updateOne(
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

    return router;
};