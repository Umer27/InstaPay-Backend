import {NotificationPayload} from "../interface/notificationPayload";
import * as admin from "firebase-admin";
import {setUserData} from "../helper/UserData";
import {NotificationType, sendNotification, setNotificationData} from "../helper/notification";
import {createShadowUserAndAccount, updateBalanceShadowAccount} from "../helper/ShadowUser";
import {sendTwilioMessage, setTwilioMessages} from "../helper/Twillio";
import {MessagePayload} from "../interface/TwillioMessagesPayload";

exports.Notification = async (req: any, res: any) => {
    try {
        const transactionId = req.body.transactionId

        const accData: NotificationPayload = {}
        const penData: NotificationPayload = {}
        const mesData: MessagePayload = {}

        let doc = await admin.firestore().collection("Transactions").doc(transactionId).get()
        let transData = doc.data()
        if (transData) {
            const acceptedUsers: string[] = transData.acceptedUsers
            const pendingUsers: string[] = transData.pendingUsers
            const invitedUsers: string[] = transData.invitedUsers

            if (acceptedUsers.length > 0) {
                //fill token in Data {}
                // get accepted users token
                await setUserData(accData, acceptedUsers, transData.initiatorId,transData.transactionId)
                //fill message field in accData
                setNotificationData(accData, transData, NotificationType.Accepted)
            }

            if (pendingUsers.length > 0) {
                //get pending users token
                await setUserData(penData, pendingUsers, transData.initiatorId,transData.transactionId)
                //fill message field in penData
                setNotificationData(penData, transData, NotificationType.Pending)
            }

            if (invitedUsers.length > 0) {
                //create shadow user
                const transactionUpdated: boolean = await createShadowUserAndAccount(invitedUsers, transData)

                if (transactionUpdated) {
                    doc = await admin.firestore().collection("Transactions").doc(transactionId).get()
                    transData = doc.data()
                }


                if (transData) {
                    //update shadow account balance
                    const transPerformed = await updateBalanceShadowAccount(transData.invitedUsers, doc)

                    if (transData.pendingUsers.length === 0 && transData.invitedDebitors.length === 0) {
                        await doc.ref.update({
                            transactionStatus: 'completed',
                        })
                    }
                    //Form Messages
                    await setTwilioMessages(mesData, transData.invitedUsers, transData, transPerformed);
                    //send twilio messages
                    await sendTwilioMessage(mesData, transData.invitedUsers);

                }

            }

            //send individual notification to each users
            const users = [...acceptedUsers, ...pendingUsers]
            const data = Object.assign({}, accData, penData);
            await sendNotification(users, data)
            res.status(200).send({
                message: 'notifications successfully sent',
            })
        }

    } catch (err) {
        res.status(500).send({message: 'server phat gya', err: err})
        console.log('Firestore Query Failed:', err);
    }
}

exports.NotificationTest = async (req: any, res: any) => {
    try {
        const transactionId = req.body.transactionId

        const accData: NotificationPayload = {}
        const penData: NotificationPayload = {}
        const mesData: MessagePayload = {}

        let doc = await admin.firestore().collection("Transactions").doc(transactionId).get()
        let transData = doc.data()
        if (transData) {
            const acceptedUsers: string[] = transData.acceptedUsers
            const pendingUsers: string[] = transData.pendingUsers
            const invitedUsers: string[] = transData.invitedUsers

            if (acceptedUsers.length > 0) {
                //fill token in Data {}
                // get accepted users token
                await setUserData(accData, acceptedUsers, transData.initiatorId,transData.transactionId)
                //fill message field in accData
                setNotificationData(accData, transData, NotificationType.Accepted)
            }

            if (pendingUsers.length > 0) {
                //get pending users token
                await setUserData(penData, pendingUsers, transData.initiatorId,transData.transactionId)
                //fill message field in penData
                setNotificationData(penData, transData, NotificationType.Pending)
            }

            if (invitedUsers.length > 0) {
                //create shadow user
                const transactionUpdated: boolean = await createShadowUserAndAccount(invitedUsers, transData)

                if (transactionUpdated) {
                    doc = await admin.firestore().collection("Transactions").doc(transactionId).get()
                    transData = doc.data()
                }
                if (transData) {
                    //update shadow account balance
                    const transPerformed = await updateBalanceShadowAccount(transData.invitedUsers, doc)
                    if (transData.pendingUsers.length === 0 && transData.invitedDebitors.length === 0) {
                        await doc.ref.update({
                            transactionStatus: 'completed',
                        })
                    }
                    //Form Messages
                    await setTwilioMessages(mesData, transData.invitedUsers, transData, transPerformed);
                    //send twilio messages
                    await sendTwilioMessage(mesData, transData.invitedUsers);
                }

            }

            //send individual notification to each users
            const users = [...acceptedUsers, ...pendingUsers]
            const data = Object.assign({}, accData, penData);
            await sendNotification(users, data)
            res.status(200).send({
                message: 'notifications successfully sent',
            })
        }

    } catch (err) {
        res.status(500).send({message: 'server phat gya', err: err})
        console.log('Firestore Query Failed:', err);
    }
}