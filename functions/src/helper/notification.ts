import {Notification, NotificationData, NotificationPayload} from "../interface/notificationPayload";
import * as admin from "firebase-admin";
import {setUserData, setUserDataFromMerchant} from "./UserData";
import {BonusTransaction} from "./Transaction";
import {logNotificationDataFirestore} from "./FireStore"

export enum NotificationType {
    Accepted,
    Pending,
    UserAccepted,
    UserRejected,
    Transaction
}

export function setNotificationData(data: NotificationPayload, transData: FirebaseFirestore.DocumentData, type: number): void {

    switch (type) {
        case NotificationType.Accepted:
            const accUsers: string[] = transData.acceptedUsers
            for (const userId of accUsers) {
                data[userId].message = `${transData.initiatorName} has credited an amount of Rs. ${transData.transactions[userId].amount} in your account in '${transData.groupName}'.`
                data[userId].title = `Group Credit Request`
            }
            break
        case NotificationType.Pending:
            const penUsers: string[] = transData.pendingUsers
            for (const userId of penUsers) {
                if (transData.transactionMode === 'group') {
                    data[userId].message = `${transData.initiatorName} requested you an amount of Rs. ${transData.transactions[userId].amount} in '${transData.groupName}'.`
                    data[userId].title = `Group Debit Request`
                } else {
                    data[userId].message = `${transData.initiatorName} requested you an amount of Rs. ${transData.transactions[userId].amount}.`
                    data[userId].title = `Debit Request`
                }
            }
            break
    }
    return
}

function setNotificationsData(data: NotificationPayload, transData: FirebaseFirestore.DocumentData, userId: string, type: number): void {
    switch (type) {
        case NotificationType.UserAccepted:
            const user: string[] = Object.keys(data)
            data[user[0]].message = `${transData.transactions[userId].name} accepted your credit request of an amount of Rs. ${transData.transactions[userId].amount} in '${transData.groupName}'.`
            data[user[0]].title = `Group Credit Request Accepted`
            break
        case NotificationType.UserRejected:
            let involvedUsers: string[] = transData.involvedUsers
            const filteredItems = involvedUsers.filter(item => item !== userId)
            involvedUsers = filteredItems.filter((id) => !transData.invitedUsers.includes(id))

            if (transData.transactionMode === 'group') {
                for (const id of involvedUsers) {
                    if (id === transData.initiatorId) {
                        data[id].message = `${transData.transactions[userId].name} rejected your credit request of an amount of Rs. ${transData.transactions[userId].amount} in '${transData.groupName}' and all deducted amount has been transferred to your instapay account.`
                        data[id].title = `Group Credit Request Rejected`
                    } else {
                        data[id].message = `'${transData.groupName}' transaction was rejected by ${transData.transactions[userId].name} and all deducted amount has been transferred to your instapay account.`
                        data[id].title = `Group Transaction Rejected`
                    }
                }
            } else {
                data[involvedUsers[0]].message = `${transData.transactions[userId].debitorName} rejected your credit request of an amount of Rs. ${transData.transactions[userId].amount}.`
                data[involvedUsers[0]].title = `Credit Request Rejected`
            }
            break
        case NotificationType.Transaction:
            let involveUsers: string[] = transData.involvedUsers

            involveUsers = involveUsers.filter((id) => !transData.invitedUsers.includes(id))

            if (transData.transactionMode === 'group') {
                for (const uId of involveUsers) {
                    if (transData.creditBalance === 0 && uId !== transData.initiatorId) {
                        //individual messages (all debit)
                        data[uId].message = `All transactions of '${transData.groupName}' are now completed and an amount of Rs. ${transData.transactions[uId].amount} was credited to you.`
                    } else {
                        data[uId].message = `All transactions of '${transData.groupName}' are now completed.`
                    }//individual messages (all debit)
                    data[uId].title = `Group Transaction Successful`
                }
            } else {
                const key: string[] = Object.keys(transData.transactions)
                if (transData.transactionType === 'credit') {
                    data[transData.initiatorId].message = `${transData.transactions[key[0]].debitorName} accepted your credit request of an amount of Rs. ${transData.transactions[key[0]].amount}.`
                    data[transData.initiatorId].title = `Credit Request Accepted`
                } else {
                    data[key[0]].message = `${transData.initiatorName} credited you an amount of Rs. ${transData.transactions[key[0]].amount}.`
                    data[key[0]].title = `Payment Received`
                }
            }
            break
    }

}

export function setBonusNotificationsData(bonusData: NotificationPayload, invitedby: string[], phoneNumber: string): void {
    for (const userId of invitedby) {
        bonusData[userId].message = `You have received Rs. 100 cashback against your invitation to ${phoneNumber}`
        bonusData[userId].title = `Congratulations!`
    }

}

export async function sendNotification(users: string[], data: NotificationPayload): Promise<void> {
    try {
        for (const user of users) {
            try {
                const payload = {
                    notification: {
                        title: data[user].title,
                        body: data[user].message
                    },
                    data: {
                        avatar: data[user].UserData.avatar,
                        initiatorId: data[user].UserData.initiatorId,
                        transactionId: data[user].UserData.transactionId,
                        notificationType: data[user].UserData.notificationType,
                    },
                    token: data[user].UserData.token
                }
                await logNotificationData(user, payload.notification, payload.data)
                await admin.messaging().send(payload)
            } catch (err) {
                console.log(`send notification to user ${user} failed:` + err)
            }
        }
    } catch (err) {
        console.log(`send notification to users failed:` + err)
    }
}

async function logNotificationData(userId: string, notification: Notification, data: NotificationData) {
    await logNotificationDataFirestore(userId, notification, data)
}

export async function userAcceptNotification(accUserId: string, transData: FirebaseFirestore.DocumentData): Promise<void> {
    const payload: NotificationPayload = {}
    const user: string[] = []
    user.push(transData.initiatorId)
    await setUserData(payload, user, transData.initiatorId, transData.transactionId)
    setNotificationsData(payload, transData, accUserId, NotificationType.UserAccepted)
    await sendNotification(user, payload)
}

export async function userRejectedNotification(rejUserId: string, transData: FirebaseFirestore.DocumentData): Promise<void> {
    const payload: NotificationPayload = {}
    let involvedUsers: string[] = transData.involvedUsers
    const filteredItems = involvedUsers.filter(item => item !== rejUserId)
    //remove invited users
    involvedUsers = filteredItems.filter((user) => !transData.invitedUsers.includes(user))
    await setUserData(payload, filteredItems, transData.initiatorId, transData.transactionId)
    setNotificationsData(payload, transData, rejUserId, NotificationType.UserRejected)
    await sendNotification(filteredItems, payload)
}

export async function transactionNotification(accUserId: string, transData: FirebaseFirestore.DocumentData) {
    const payload: NotificationPayload = {}
    let involvedUsers: string[] = transData.involvedUsers
    if (transData.transactionMode === 'single') {
        const key: string[] = Object.keys(transData.transactions)
        if (transData.transactionType === 'credit') {
            involvedUsers = involvedUsers.filter(item => item !== transData.transactions[key[0]].debitor)
        } else {
            involvedUsers = involvedUsers.filter(item => item !== transData.initiatorId)
        }
    }
    //remove invited users
    involvedUsers = involvedUsers.filter((user) => !transData.invitedUsers.includes(user))
    await setUserData(payload, involvedUsers, transData.initiatorId, transData.transactionId)
    setNotificationsData(payload, transData, accUserId, NotificationType.Transaction)
    await sendNotification(involvedUsers, payload)
}

export async function sendBonusAndNotifiToTop3Invitors(invited: string[], invitors: string[], phoneNumber: string): Promise<void> {
    let invitedby: string[] = invitors
    if (invitedby.length > 3) invitedby = invitors.slice(0, 3)
    const bonusData: NotificationPayload = {}

    await BonusTransaction(invitedby)
    await BonusTransaction(invited)

    await setUserDataFromMerchant(bonusData, invitedby)

    setBonusNotificationsData(bonusData, invitedby, phoneNumber)

    await sendNotification(invitedby, bonusData)
}