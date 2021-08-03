import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
import authRouter from './routes/auth';
import TransactionRouter from './routes/Transaction';
import ReservedBalanceRouter from './routes/ReservedBalance';
import getfriendsTransactionRouter from './routes/getfriendsTransaction';
import verificationRouter from './routes/verification';
import verifyCodeRouter from './routes/verifyCode';
import NotificationRouter from './routes/Notification';
import inviteUserRouter from './routes/InviteUserRouter';
import createAccountRouter from './routes/createAccountRouter';
import TestRouter from './routes/test';
import * as serviceAccount from './serviceAccount.json'
import express from 'express';

const accountSid = 'AC11c482af9271d7d64a715c3689b77681';
const authToken = '992e2308a16740056b8a3c8f6120cf50';
const client = require('twilio')(accountSid, authToken);

admin.initializeApp({
    credential: admin.credential.cert(<any>serviceAccount)
})

const app = express()

app.use('/auth', authRouter)
app.use('/Transaction', TransactionRouter)
app.use('/ReservedBalance', ReservedBalanceRouter)
app.use('/getfriendsTransaction', getfriendsTransactionRouter)
app.use('/verification', verificationRouter)
app.use('/verifyCode', verifyCodeRouter)
app.use('/Notification', NotificationRouter)
app.use('/inviteUser', inviteUserRouter)
app.use('/createAccount', createAccountRouter)
app.use('/test', TestRouter)

exports.instaPay = functions.https.onRequest(app)


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const zaiday = functions.https.onRequest(async (request, response) => {

    try {
        const token = await client.tokens.create()
        response.status(200).send({token: token})
    } catch (err) {
        response.status(500).send({message: 'server phat gya'})
    }

});