import * as admin from "firebase-admin";
import {sendMessage} from "../helper/Twillio";
import {createSingleShadowUserAndAccount} from "../helper/ShadowUser";

exports.inviteUser = async (req: any, res: any) => {

    try {

        const name = req.body.name
        const phoneNumber = req.body.phoneNumber
        const initiatorName = req.body.initiatorName
        const invitedUid = req.user.uid
        const message: string = `${initiatorName} invited you to join Instapay, Please install InstaPay via: www.creativemorph.com/`

        const userDoc = await admin.firestore().collection("Users").where("phoneNumber", "==", phoneNumber).get()

        if (userDoc.size > 0) {
            res.status(402).send({
                message: "The phone number is already in use by another account."
            })
        } else {

            const invitedUserDoc = await admin.firestore().collection("Invited_Users").where("phoneNumber", "==", phoneNumber).get()

            if (invitedUserDoc.size > 0) {
                await invitedUserDoc.docs[0].ref.update({
                    invitedBy: admin.firestore.FieldValue.arrayUnion(invitedUid),
                })
            } else {
                const userId = admin.firestore().collection('Invited_Users').doc().id;
                await createSingleShadowUserAndAccount(invitedUid, userId, phoneNumber, name)
            }

            await sendMessage(phoneNumber, message)
            res.status(200).send({
                message: "success"
            })
        }

    } catch (err) {
        res.status(500).send({message: "server phar diya to na"})
    }
};

exports.inviteUserTest = async (req: any, res: any) => {

    try {

        const name = req.body.name
        const phoneNumber = req.body.phoneNumber
        const initiatorName = req.body.initiatorName
        const invitedUid = "req.user.uid"

        const message: string = `${initiatorName} invited you to join Instapay, Please install InstaPay via: www.gandiWalliVedios.com`

        const userDoc = await admin.firestore().collection("Users").where("phoneNumber", "==", phoneNumber).get()

        if (userDoc.size > 0) {
            res.status(402).send({
                mess: "The phone number is already in use by another account."
            })
        } else {

            const invitedUserDoc = await admin.firestore().collection("Invited_Users").where("phoneNumber", "==", phoneNumber).get()

            if (invitedUserDoc.size > 0) {
                await invitedUserDoc.docs[0].ref.update({
                    invitedBy: admin.firestore.FieldValue.arrayUnion(invitedUid),
                })
            } else {
                const userId = admin.firestore().collection('Invited_Users').doc().id;
                await createSingleShadowUserAndAccount(invitedUid, userId, phoneNumber, name)
            }

            await sendMessage(phoneNumber, message)
            res.status(200).send({
                doc: "success"
            })
        }

    } catch (err) {
        res.status(500).send({mess: "server phar diya to na"})
    }
};