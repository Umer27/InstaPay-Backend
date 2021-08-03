import * as admin from "firebase-admin";
import {isShadowUser, makeShadowUserInstapayUser} from "../helper/ShadowUser";

const serviceId = 'VA3945617fb9b8cf568cb0cd0d2f7cca0e'
const accountSid = 'AC63d4e17ceff92af6b1fd28bedb753ab9'
const authToken = 'd99abdebf6d40d19b10013b09e71d2c3'
const client = require('twilio')(accountSid, authToken);

exports.verifyCode = async (req: any, res: any) => {
    try {
        const userId = req.user.uid
        const phoneNumber = req.body.number
        const message = await client.verify
            .services(serviceId)
            .verificationChecks
            .create({
                to: req.body.number,
                code: req.body.userCode
            })

        if (message.status === 'approved') {
            await admin.firestore().collection('Users').doc(userId).update({
                verifiedNumber: true,
                phoneNumber: req.body.number
            })
            await admin.firestore().collection('Registered_Users').doc(userId).update({
                verifiedNumber: true,
                phoneNumber: req.body.number
            })

            const shadowUser = await isShadowUser(phoneNumber)
            if (shadowUser) {
                await makeShadowUserInstapayUser(userId, phoneNumber)
            }

            res.status(200).send({message: 'approved successfully'})
        } else if (message.status === 'pending')
            res.status(401).send({
                message: 'Enter valid code',
            })
        else
            res.status(422).send({
                message: 'Unprocessable Entity',
            })
    } catch (err) {
        if (err.status === 400)
            res.status(400).send({
                message: 'Enter valid number',
                req: req.body
            })
        else if (err.status === 404)
            res.status(404).send({
                message: 'No verification number sent to this number or code may be expired for this number'
            })
        else
            res.status(500).send({message: 'server phat gya', err: err})
        console.log('Firestore Query Failed:', err);
    }
}