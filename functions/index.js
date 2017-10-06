const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
const VERIFIED_TOKEN = "VERIFIED_TOKEN_BEAR"
exports.bearService = functions.https.onRequest((request, response) => {
    if(request.method == "GET") {
        if (request.query['hub.mode'] === 'subscribe' &&
        request.query['hub.verify_token'] === "VERIFIED_TOKEN_BEAR") {
            console.log("Validating webhook");
            response.status(200).send(request.query['hub.challenge']);
        }
        else {
            console.error("Failed validation. Make sure the validation tokens match.");
            response.sendStatus(403);
        }
    } else if(request.method == "POST") {
        var data = request.body;
        if (data.object === 'page') {
            data.entry.forEach(entry => {
                var pageID = entry.id;
                var timeOfEvent = entry.time;
                console.log('entry : ${JSON.stringify(entry)}')
                entry.messaging.forEach(event => {
                    if (event.message) {
                        receivedMessage(event)
                    } else {
                        console.log("Webhook received unknown event: ", event)
                    }
                })       
            })
            response.sendStatus(200)
        }
    }
});

function receivedMessage(event) {
    let senderID = event.sender.id
    let recipientID = event.recipient.id
    let timeOfMessage = event.timestamp
    let message = event.message

    //ถ้าข้อความมาแล้ว log ตรงนี้จะเห็นข้อความเลยครับ
    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage)
    console.log(JSON.stringify(message))
    let messageId = message.mid
    let messageText = message.text
    let messageAttachments = message.attachments

    if (messageText) {
        //ส่วนนี้ใช้ Switch case มาทำ rule-base คือดักคำมาทำงานแตกต่างกันไป
        //เรียกได้ว่าเป็นวิธีที่ basic และง่ายสุดในการทำบอทก็ว่าได้ 555
        if (messageText.toLowerCase()) {
            messageText = messageText.toLowerCase()
            if (checkHello(messageText)) {
                greeting(senderID)
            } else if (checkHelloBear(messageText)) {
                sendTextMessage(senderID, "จ๋าาา")
            } else if (checkManual(messageText)) {
                sendTextMessage(senderID, "น้องหมีสามารถสุ่มอาหารตามสั่งได้ในตอนนี้ ในอนาคตเก็บเมนูที่คุณชอบได้ และอัพรูปอาหารอวดหมีได้ด้วยนะ")
            } else if (checkHungry(messageText)) {
                randomWhatToEat(senderID)
            } else if (checkRandomFoodFeedback(messageText)) {
                saveUserFavManu(senderID, messageText)
            } else if (checkWhereToEat(messageText)) {
                randonWhereToEat(senderID)
            } else if ((messageText.search('กิน') >= 0) || (messageText.search('ยัง') >= 0)) {
                sendTextMessage(senderID, "ก็มีแซลม่อนบินเข้าปากเรื่อยๆ ก็ไม่รู้วสินะ")
            } else if ((messageText.search('ใคร') >= 0) || (messageText.search('ชื่อ') >= 0)) {
                sendTextMessage(senderID, "ก็นุ้งหมีตัวแตกไง จะใครหล่ะ")
            } else {
                sendTextMessage(senderID, "หมีเพิ่งเข้ามา กทม. ขอเวลาน้องหมีศึกษาภาษาไทยก่อนน๊า อุ๋ง")
            }
        }
    } else if (messageAttachments) {
        //sendTextMessage(senderID, "Message with attachment received");
        sendTextMessage(senderID, "หมีส่งรูปกับสติ๊กเกอร์ไม่เป็น สอนหมีหน่อยนะ");
    }
}

function checkHello(messageText) {
    return (messageText.search('hello') >= 0) 
        || (messageText.search('hi') >= 0)
        || (messageText.search('สวัสดี') >= 0)
        || (messageText.search('หวัดดี') >= 0)
        || (messageText.search('ดีจ้า') >= 0)
        || (messageText.search('ทัก') >= 0);
}

function checkHelloBear(messageText) {
    return (messageText.search('หมีจ๋า') >= 0)
        || (messageText.search('คุณหมี') >= 0)
        || (messageText.search('หมี') >= 0);
}

function checkManual(messageText) {
    return (messageText.search('ทำไรได้บ้าง') >= 0)
        || (messageText.search('ทำไรเป็นบ้าง') >= 0);
}

function checkHungry(messageText) {
    return (messageText.search('ไม่') == -1)
        && ((messageText.search('สุ่ม') >= 0)
        || (messageText.search('เอา') >= 0)
        || (messageText.search('ได้') >= 0)
        || (messageText.search('hungry') >= 0)
        || (messageText.search('หิว') >= 0)
        || 
        (
            (
                (messageText.search('กิน') >= 0)
                || (messageText.search('แดก') >= 0)
                || (messageText.search('แดรก') >= 0)
                || (messageText.search('ยัด') >= 0)
                || (messageText.search('eat') >= 0)
            ) 
            && 
            (
                (messageText.search('ไร') >= 0)
                || (messageText.search('what') >= 0)
            )
            
        ));
}

let isInRandomMode = false
function randomWhatToEat(recipientId) {
    let foodSample = ['กระเพราไก่ไข่ดาว', 'สุกี้แห้งทะเล', 'ราดหน้ากุ้ง', 'ก๋วยเตี๋ยวคั่วไก่', 
        'ข้าวผัดปู', 'ไข่เจียวหมูสับ', 'มาม่าต้มยำ', 'ก๋วยเตี๋ยวหมูสับ', 'ปลาหมึกผัดไข่เค็ม',
        'ยำวุ้นเส้นทะเล', 'ฉู่ฉี่ไข่เจียว', 'ไข่ระเบิด', 'ข้าวทะเลพริกไทยดำ', 'หมูกรอบผัดนํ้าพริกเผา',
        'ข้าวผัดปลาสลิด', 'ข้าวผัดหอยลายนํ้าพริกเผา', 'มักกะโรนีผัด', 'ข้าวผัดกระหลํ่าปลีหมูใส่พริก', 'หมูผัดนํ้ามันหอย',
        'ยำมาม่า', 'มาม่าปลากระป๋อง', 'ลาบหมู', 'ข้าวผัดแกงเขียวหวาน', 'ไก่ผัดเม็ดมะม่วง' , 'ปูผัดผงกระหรี่']
    let rand = foodSample[Math.floor(Math.random() * foodSample.length)];
    sendTextMessage(recipientId, rand)
    sendTextMessage(recipientId, 'ชอบไหมจ๊ะ')
    isInRandomMode = true
}

function randonWhereToEat(recipientId) {
    let foodSample = ['KFC', 'Mc-Donald', 'Burger King', 'Coco Ichibanya', 'Yayoi', 'Bonchon', 'Pizza Hut']
    let rand = foodSample[Math.floor(Math.random() * foodSample.length)];
    sendTextMessage(recipientId, rand)
    sendTextMessage(recipientId, 'ชอบไหมจ๊ะ')
    isInRandomMode = true
}

function checkRandomFoodFeedback(messageText) {
    return ((messageText.search('ชอบ') >= 0)
            || (messageText.search('ได้') >= 0)
            || (messageText.search('ไม่') >= 0)
            || (messageText.search('yes') >= 0) 
            || (messageText.search('no') >= 0))
        && isInRandomMode;
}

function saveUserFavManu(recipientId, messageText) {
    if (((messageText.search('ชอบ') >= 0) || (messageText.search('yes') >= 0)) 
        && (messageText.search('ไม่') == -1)) {
        //sendTextMessage(recipientId, 'ขอบคุณที่ชอบนะ หมีบันทึกเมนูที่ชอบใน database ให้แล้วนะ')
        sendTextMessage(recipientId, 'ขอบคุณที่ชอบนะ')
    } else if (( messageText.search('ไม่') >= 0) && ( messageText.search('สุ่ม') >= 0)) {
         sendTextMessage(recipientId, 'ไม่เป็นไรจ้า')
    } else if ((messageText.search('ไม่') >= 0) || (messageText.search('no') >= 0)) {
        sendTextMessage(recipientId, 'สุ่มอาหารใหม่ไหมเอ่ยย')
    } else {
        sendTextMessage(recipientId, 'ขอบคุณจ้า')
    }
    isInRandomMode = false
}

function checkWhereToEat(messageText) {
    return (
        (
            (messageText.search('กิน') >= 0)
            || (messageText.search('แดก') >= 0)
            || (messageText.search('แดรก') >= 0)
            || (messageText.search('ยัด') >= 0)
            || (messageText.search('eat') >= 0)
        ) 
        && 
        (
            (messageText.search('ไหน') >= 0)
            || (messageText.search('where') >= 0)
        )
        
    );
}

function greeting(recipientId) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Hello, สวัสดีจ้าาา นึกเมนูอาหารไม่ออกช่ะม่ะ มาคุยกับนุ้งหมีได้นะ"
        }
    }
    callSendAPI(messageData)
}

function sendTextMessage(recipientId, messageText) {
    //จัดข้อความที่จะส่งกลับในรูปแบบ object ตามที่ Messenger กำหนด
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText//,
            //metadata: "DEVELOPER_DEFINED_METADATA"
        }
    }
    callSendAPI(messageData)
}

const axios = require('axios')
function callSendAPI(messageData) {
    console.log('message data : ${JSON.stringify(messageData)}');
    axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v2.6/me/messages',
        params: {
            'access_token': 'EAABwbSQ8hMoBANFExUbr2zDa03NjZAeeLMsY3buGnoQ5QoZBnoU06Fl3VAeQgCpYzyDPmZAmnLWKA5I089COxfPwOs7rEuB7edoDo1P0aNtqY3ZCfx6bsB41rZBQHtxfGr51oqGhjhhDSbCDopQ84eHZBFLpYnTPz7kDuel91HTAZDZD'
        },
        data: messageData
    })
    .then(response => {
        if (response.status == 200) {
            let body = response.data
            let recipientId = body.recipient_id;
            let messageId = body.message_id;
            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s", 
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s", 
                    recipientId);
            }
        }
        else {
            console.error("Failed calling Send API", response.status,
                response.statusText, response.data.error);
         }
    })
    .catch(error => {
        console.log('error : ${error}')
        console.log('axios send message failed');
    })
}


// exports.randomFoodService = functions.https.onRequest((req, res) => {
//     // Grab the text parameter.
//     const original = req.query.text;
//     // Push the new message into the Realtime Database using the Firebase Admin SDK.
//     admin.database().ref('/food/main_course').push({original: original}).then(snapshot => {
//         // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
//         res.redirect(303, snapshot.ref);
//     });
// });

exports.randomFoodService = functions.database
    .ref('/food/main_course/{randomID}')
    .onWrite(event => {
        const food_item = event.data.val()
        // {"food_name": <some_value>}
        const food_name = food_item["food_name"];
        console.log(food_item)
        console.log(food_name)
        // event.data.ref.once('value', snapshot => {
        //     console.log(snapshot.val());
        // });

        // event.data.ref.root.child('food/curry')
    }
);

// exports.randomFoodService = functions.database.ref('/messages/{pushId}/original')
//     .onWrite(event => {
//         // Grab the current value of what was written to the Realtime Database.
//         const original = event.data.val();
//         console.log('Uppercasing', event.params.pushId, original);
//         const uppercase = original.toUpperCase();
//         // You must return a Promise when performing asynchronous tasks inside a Functions such as
//         // writing to the Firebase Realtime Database.
//         // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
//         return event.data.ref.parent.child('uppercase').set(uppercase);
//     }
// );
