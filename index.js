// パッケージ取得
const fs = require("fs");
// import * as fs from 'fs';
// const https = require("https");
const express = require("express");
const app = express();

const line = require('@line/bot-sdk'); // sdkインポート
const Client = line.Client; // クライアントモジュール
const RichMenu = line.RichMenu; // リッチメニューモジュール
const knex = require('./db/knex'); // kenxインポート
const { profile } = require("console");

// .envファイルから設定を読み込む
require("dotenv").config();
const PORT = process.env.PORT
const TOKEN = process.env.LINE_ACCESS_TOKEN
const SECRET = process.env.CHANNEL_SECRET
const RICH_MENU = process.env.RICH_MENU

app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

// クライアントインスタンスの作成
const client = new Client({
  channelAccessToken: TOKEN,
  channelSecret: SECRET
})
const richmenu = RICH_MENU;

// 【リッチメニュー機能】
class RichMenuCreater {

  #client = Client
  #richmenu = RichMenu
  #richMenuId = ""

  constructor(client = Client, richmenu = RichMenu) {
    this.#client = client;
    this.#richmenu = richmenu;
  }

  // デフォルトのリッチメニューを適用する
  async applyDefaultRichMenu() {
    await this.#createRichMenu();
    await this.#setRichMenuImage();
    await this.#setDefaultRichMenu();
  }

  // リッチメニューを作成する
  async #createRichMenu() {
    await this.#client.createRichMenu(
      {
        size: { width: 1200, height: 405 }, 
        "selected": true,
        "name": "Nice richmenu", // 開発用のリッチメニュー名
        "chatBarText": "Action Room", // トークルームメニューに表示される部分
        "areas": [ // タップエリア
          {
            "bounds": {
              "x": 10,
              "y": 0,
              "width": 580,
              "height": 405
            },
            "action": {
              "type": "postback",
              "label": "login",
              "data": JSON.stringify({"action":"login"})
            }},
          {
            "bounds": {
              "x": 610,
              "y": 0,
              "width": 580,
              "height": 405
            },
            "action": {
              "type": "postback",
              "label": "post",
              "data": JSON.stringify({"action":"post"})
            }
          }
        ]
        }
    ).then((richMenuId) => {
      this.#richMenuId = richMenuId;
    });
  }

  // リッチメニューに画像をアップロードして添付する
  async #setRichMenuImage() {
    await this.#client.setRichMenuImage(
      this.#richMenuId,
      fs.createReadStream("./RichMenu_background.png")
    );
  }

  // デフォルトのリッチメニューを設定する
  async #setDefaultRichMenu() {
    await this.#client.setDefaultRichMenu(this.#richMenuId);
  }

}; // クラス作成 End

const richMenuCreater = new RichMenuCreater(client, richmenu);
richMenuCreater.applyDefaultRichMenu();

// 【Webhook機能】
// LINE側にステータスコード200でレスポンスする
app.get("/webhook", (req, res) => {
    res.sendStatus(200)
  });

// 投稿内容をメッセージで送ると、DBへ登録する
app.post("/webhook", function(req, res) {
    // res.send("HTTP POST request sent to the webhook URL!")
  
const events = req.body.events;
events.forEach((event) => {

  // イベントタイプが"postback"だった場合
  if(event.type === "postback"){
    // noボタンを押した場合
    if(JSON.parse(event.postback.data).action === "no"){
      console.log('NO!');
      const eventID = JSON.parse(event.postback.data).webhookEventId
      // console.log(eventID);
      const userID = event.source.userId
      // console.log(userID);
      
      knex("drawer")
      .where({user_id: userID})
      .andWhere({event_id: eventID})
      .del()
      .then(function (results) {
      console.log(results)
      });
      
      // knex オーダーバイとリミットのサンプル
      /*
      knex("drawer")
      .select("*")
      .where({user_id: userID})
      .orderBy('post_id', 'desc')
      .first()
      .then(function (results) {
      console.log(results)
      });
      */
      
      client.replyMessage(event.replyToken, {
              "type": "text",
              "text": '投稿をキャンセルしました'
      });
    } // no if文 End
    
    else if(JSON.parse(event.postback.data).action === "yes"){
      console.log('YES!');
      client.replyMessage(event.replyToken, {
        "type": "text",
        "text": '投稿しました'
      });
    } // yes else if文 End

    else if(JSON.parse(event.postback.data).action === "post"){
      console.log('POST!');
      client.replyMessage(event.replyToken, {
        "type": "text",
        "text": '投稿内容を入力してください'
      });
    } // post else if文 End

    else if(JSON.parse(event.postback.data).action === "login"){
      const userID = event.source.userId
      
      async function test(){
      let displayNAME;
      await client.getProfile(userID)
      // console.log(profile);
      // const displayNAME = profile.displayName;
      .then((profile) => {
          console.log(profile);
          displayNAME = profile.displayName;
          console.log(profile.displayName + "1");
          console.log(displayNAME + "2");
        })
        .catch((err) => {
          // error handling
        });
          console.log(displayNAME + "3");
          const urI = "https://balaena100.xsrv.jp/Boku-Note/posts?user_id=" + userID + "&user_name=" + displayNAME;
          const uri = encodeURI(urI);
          console.log(uri);
      await client.replyMessage(event.replyToken, {
          "type": "template",
          "altText": "投稿一覧を開くボタン",
          "template": {
            "type": "buttons",
            "text": "Please click",
            "actions": [
              {
              "type": "uri",
              "label": "url",
              "uri": uri
              }
            ]
          }
        }
        );
      }
      test();
    } // login else if文 End
    
  } // if文 End

  // イベントタイプが"message"で、typeが"text"だった場合
  else if (event.type === "message" && event.message.type == "text") {

    const text = event.message.text
    const userID = event.source.userId
    const eventID = event.webhookEventId
    // console.log(eventID);
    // console.log(userID);

    knex("drawer")
    .insert({post: text, user_id: userID, event_id: eventID})
    .then(function(){
      console.log('DBへ登録しました');
    })

    // console.log(text);
    // 確認テンプレートを使用して、投稿可否を判定
    client.replyMessage(event.replyToken, {
      "type": "template",
          "altText": "投稿確認用のテンプレート",
          "template": {
            "type": "confirm",
            "text": `この内容で投稿しますか？`,
            "actions": [
              {
                "type": "postback", //"NO"が押されたらpostbackアクション
                "label": "NO",
                "data": JSON.stringify({"action":"no", "webhookEventId": eventID})
              },
              {
                "type": "postback", //"YES"が押されたらpostbackアクション
                "label": "YES",
                "data": JSON.stringify({"action":"yes"})
              }
          ]
          }
    })
  } // else if文 End

  // フォローイベント(友達追加)時の処理: ユーザー登録
  else if (event.type === "follow" /*|| event.message.text === 'ユーザー登録'*/){
    // const eventID = event.webhookEventId
    const userID = event.source.userId
    client.getProfile(userID).then((profile) => {
      console.log(profile);
      knex("master_roll")
      .insert({user_id: profile.userId, user_name: profile.displayName})
      .then(function(){
      console.log('ユーザー情報をDBへ登録しました');
    })
    });
    client.replyMessage(event.replyToken,
      {
        "type": "text",
        "text": '友達追加ありがとう。\nユーザー登録が完了しました。'
      }
    ); 
  } // else if文 End

  /* .catch(function (err) {
    console.error(err);
  }); */ 

}) // forEach End
}); // Post End
  
app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`)
})
