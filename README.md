# Chatwork to Slack

![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-1.png)

雑に作ったしメンテもする気ない

## Usage

```sh
mkdir ./exports
mkdir ./converted
goodbye_chatwork -i example@example.com -p your_password -d ./exports -x room_id
vi ./cw_users.json
node ./index.js
```

生成された CSV をインポートする

（ファイルはインポートできない）

### cw_users.json

Slack にいるメンバーの対応表

生成するコードはどこかに消えた

```js
[
  {
    // ChatWork での名前
    "name": "Masahiro Miyashiro",
    // Slack でのアカウント名
    "account": "3846masa",
    // Chatwork でのアカウントID
    "id": "999999"
  }
]
```

## Result

![result](https://gyazo.com/cbec10f341fa808053991607c4dcc2d0.png)

![result](https://gyazo.com/8700bb77e5f410b3cd89e5f0da7e4632.png)

## LICENSE

WTFPL
