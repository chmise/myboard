const express = require('express');

module.exports = function(db) {
    const router = express.Router();

    router.get("/login", function(req, res) {
        if (req.session.userid) {
            console.log("세션 유지");
            res.render("index.ejs", { user: req.session.userid });
        } else {
            res.render("login.ejs");
        }
    });
    
    router.post("/login", function(req, res) {
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

    ro.get("/logout", function(req, res) {
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

    router.get("/signup", function(req, res) {
        res.render("signup.ejs");
    });
    
    router.post("/signup", function(req, res) {
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

    return router;
}
