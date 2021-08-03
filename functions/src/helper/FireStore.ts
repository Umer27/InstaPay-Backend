import * as admin from "firebase-admin";
import {Notification, NotificationData} from "../interface/notificationPayload";

export async function getInvitedUserDocWithPhoneNumberFirestore(phoneNumber: string): Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>> {
    return await admin.firestore().collection("Invited_Users").where("phoneNumber", "==", phoneNumber).get()
}

export async function createInstapayUserFirestore(userData: any) {
    await admin.firestore().collection('Users').doc(userData.userId).set(userData)
}

export async function getTransactionWithInvolvedUserFirestore(userId: string): Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>> {
    return await admin.firestore().collection('Transactions')
        .where('involvedUsers', 'array-contains', userId)
        .get()
}

export async function moveInvitedCreditorToAccListFirestore(transId: string, userId: string) {
    await admin.firestore().collection("Transactions").doc(transId).update({
        invitedCreditors: admin.firestore.FieldValue.arrayRemove(userId),
        acceptedUsers: admin.firestore.FieldValue.arrayUnion(userId)
    })
}

export async function moveInvitedDebToPenListFirestore(transId: string, userId: string) {
    await admin.firestore().collection("Transactions").doc(transId).update({
        invitedDebitors: admin.firestore.FieldValue.arrayRemove(userId),
        pendingUsers: admin.firestore.FieldValue.arrayUnion(userId)
    })
}

export async function getUserAccDataFirestore(userId: string): Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>> {
    return await admin.firestore().collection("Instapay_Accounts").doc(userId).get()
}

export async function setUserAccDataFirstore(userData: any) {
    await admin.firestore().collection("Instapay_Accounts").doc(userData.userId).set(userData)
}

export async function setInvitationIdtoUserDocFirestore(userId: string, shadowUserId: any) {
    await admin.firestore().collection("Users").doc(userId).set({invitationId: shadowUserId})
}

export async function setInvitationStatusJoinedFirestore(shadowUserId: any) {
    await admin.firestore().collection("Invited_Users").doc(shadowUserId).update({invitationStatus: 'joined'})
}

export async function logNotificationDataFirestore(userId: string, notification: Notification, data: NotificationData) {
    const notDocRef = admin.firestore().collection(`Users_Notifications/${userId}/notifications`).doc()
    await notDocRef.set({
        ...notification,
        ...data,
        timestamp: new Date().getTime(),
        notificationId: notDocRef.id
    })
}

export async function replaceTransactionUserIdFirestore(transData: any, userId: string, newUserId: string) {
    const invitor = userId === transData.transactions[userId].creditor ? "creditor" : "debitor"


    await admin.firestore().collection("Transactions").doc(transData.transactionId).update({
        invitedUsers: admin.firestore.FieldValue.arrayUnion(newUserId),
        involvedUsers: admin.firestore.FieldValue.arrayUnion(newUserId),
        invitedCreditors: invitor === "creditor" ? admin.firestore.FieldValue.arrayUnion(newUserId) : transData.invitedCreditors,
        invitedDebitors: invitor === "debitor" ? admin.firestore.FieldValue.arrayUnion(newUserId) : transData.invitedDebitors,
        transactions: {
            ...transData.transactions,
            [newUserId]: transData.transactions[userId]
        },
    })

    await admin.firestore().collection("Transactions").doc(transData.transactionId).update({
        invitedUsers: admin.firestore.FieldValue.arrayRemove(userId),
        involvedUsers: admin.firestore.FieldValue.arrayRemove(userId),
        invitedCreditors: invitor === "creditor" ? admin.firestore.FieldValue.arrayRemove(userId) : transData.invitedCreditors,
        invitedDebitors: invitor === "debitor" ? admin.firestore.FieldValue.arrayRemove(userId) : transData.invitedDebitors,
        [`transactions.${userId}`]: admin.firestore.FieldValue.delete(),
        [`transactions.${newUserId}.${invitor}`]: newUserId,
    })
}

