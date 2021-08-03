import * as admin from "firebase-admin";
import {UsersTransactions} from "./Transaction";
import {
    getInvitedUserDocWithPhoneNumberFirestore,
    getTransactionWithInvolvedUserFirestore,
    getUserAccDataFirestore,
    moveInvitedCreditorToAccListFirestore,
    moveInvitedDebToPenListFirestore,
    replaceTransactionUserIdFirestore, setInvitationIdtoUserDocFirestore, setInvitationStatusJoinedFirestore,

} from "./FireStore";
import {createInstapayAccount} from "./UserData";
import {addUserFavourites, Collection} from "./Favourites";
import {sendBonusAndNotifiToTop3Invitors} from "./notification";
import {reserveAckAmountUser} from "./Reserved";

export async function createShadowUserAndAccount(user: string[], transData: FirebaseFirestore.DocumentData): Promise<boolean> {

    for (const id of user) {
        const invitor = id === transData.transactions[id].creditor ? "creditor" : "debitor"

        const phoneNumber = invitor === "creditor" ? transData.transactions[id].creditorName : transData.transactions[id].debitorName

        const invitedUserDoc = await admin.firestore().collection("Invited_Users").where("phoneNumber", "==", phoneNumber).get()

        if (invitedUserDoc.size > 0) {
            await invitedUserDoc.docs[0].ref.update({
                invitedBy: admin.firestore.FieldValue.arrayUnion(transData.initiatorId),
            })

            await admin.firestore().collection("Transactions").doc(transData.transactionId).update({
                invitedUsers: admin.firestore.FieldValue.arrayUnion(invitedUserDoc.docs[0].data().userId),
                involvedUsers: admin.firestore.FieldValue.arrayUnion(invitedUserDoc.docs[0].data().userId),
                invitedCreditors: invitor === "creditor" ? admin.firestore.FieldValue.arrayUnion(invitedUserDoc.docs[0].data().userId) : transData.invitedCreditors,
                invitedDebitors: invitor === "debitor" ? admin.firestore.FieldValue.arrayUnion(invitedUserDoc.docs[0].data().userId) : transData.invitedDebitors,
                transactions: {
                    ...transData.transactions,
                    [invitedUserDoc.docs[0].data().userId]: transData.transactions[id]
                },
            })

            await admin.firestore().collection("Transactions").doc(transData.transactionId).update({
                invitedUsers: admin.firestore.FieldValue.arrayRemove(id),
                involvedUsers: admin.firestore.FieldValue.arrayRemove(id),
                invitedCreditors: invitor === "creditor" ? admin.firestore.FieldValue.arrayRemove(id) : transData.invitedCreditors,
                invitedDebitors: invitor === "debitor" ? admin.firestore.FieldValue.arrayRemove(id) : transData.invitedDebitors,
                [`transactions.${id}`]: admin.firestore.FieldValue.delete(),
                [`transactions.${invitedUserDoc.docs[0].data().userId}.${invitor}`]: invitedUserDoc.docs[0].data().userId,
            })

            return true

        } else {
            const params = {
                userId: id,
                name: phoneNumber,
                phoneNumber: phoneNumber,
                invitedBy: [transData.initiatorId]
            };

            await admin.firestore().collection('Invited_Users').doc(id).set(params);

            const dummyAccount = {
                userId: id,
                totalBalance: 0,
                status: 'invited'
            };

            await admin.firestore().collection('Instapay_Accounts').doc(id).set(dummyAccount);

            return false
        }

    }

    return false
}

export async function createSingleShadowUserAndAccount(invitedUid: string, userId: string, phoneNumber: string, name: string): Promise<void> {

    const params = {
        userId: userId,
        name: name,
        phoneNumber: phoneNumber,
        invitedBy: [invitedUid],
        invitationStatus: 'pending',
        invitationId: userId
    };

    await admin.firestore().collection('Invited_Users').doc(userId).set(params);

    const dummyAccount = {
        userId: userId,
        totalBalance: 0,
    };

    await admin.firestore().collection('Instapay_Accounts').doc(userId).set(dummyAccount);

}

export async function updateBalanceShadowAccount(user: string[], doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>): Promise<boolean> {

    const transData = doc.data()
    if (transData) {
        const invitedDebitUsers: string[] = []
        for (const id of user) {
            if (transData.transactions[id].creditor === id) {
                invitedDebitUsers.push(id)
            }
        }
        if (transData.pendingUsers.length === 0 && transData.invitedDebitors.length === 0) {
            await UsersTransactions(invitedDebitUsers, transData)
            return true
        } else {
            await reserveAckAmountUser(doc, invitedDebitUsers)
            return false
        }
    }
    return false

}

export async function isShadowUser(phoneNumber: string): Promise<boolean> {
    const invitedUserDoc = await getInvitedUserDocWithPhoneNumberFirestore(phoneNumber)
    return invitedUserDoc.size > 0;
}

async function replaceShadowUserTransactionIds(shadowUserId: string, newUserId: string) {
    const transDocs = await getTransactionWithInvolvedUserFirestore(shadowUserId)
    for (let i = 0; i < transDocs.size; i++) {
        const transData = transDocs.docs[i].data()
        await replaceTransactionUserIdFirestore(transData, shadowUserId, newUserId)
    }
}

export async function addToFavouritesIfTransactionCompleted(userId: string) {
    const updatedTransDocs = await getTransactionWithInvolvedUserFirestore(userId)
    for (let i = 0; i < updatedTransDocs.size; i++) {
        const transData = updatedTransDocs.docs[i].data()
        if (transData.transactionStatus === 'completed') {
            const user: string[] = [userId]
            await addUserFavourites(user, transData, Collection.Users)
        }
    }
}

async function MoveInvitedToAccPenList(userId: string) {
    const updatedTransDocs = await getTransactionWithInvolvedUserFirestore(userId)
    for (let i = 0; i < updatedTransDocs.size; i++) {
        const transData = updatedTransDocs.docs[i].data()
        const creditors: string[] = transData.invitedCreditors
        if (creditors.includes(userId)) {
            await moveInvitedCreditorToAccListFirestore(transData.transactionId, userId)
        } else {
            await moveInvitedDebToPenListFirestore(transData.transactionId, userId)
        }
    }
}

async function createNewIdAccAndDelPrevAcc(shadowUserId: string, userId: string) {
    const shadowAccDoc = await getUserAccDataFirestore(shadowUserId)
    await shadowAccDoc.ref.delete()
    const shadowAccData = shadowAccDoc.data()
    if (shadowAccData) {
        shadowAccData.userId = userId
        await createInstapayAccount(shadowAccData)
    }
}

export async function makeShadowUserInstapayUser(userId: string, phoneNumber: string): Promise<void> {
    const invitedUserDoc = await getInvitedUserDocWithPhoneNumberFirestore(phoneNumber)
    if (invitedUserDoc.size > 0) {

        const shadowUserId = invitedUserDoc.docs[0].data().userId
        const invitedby: string[] = invitedUserDoc.docs[0].data().invitedBy

        await createNewIdAccAndDelPrevAcc(shadowUserId, userId)
        // replace ids in transactions
        await replaceShadowUserTransactionIds(shadowUserId, userId)
        //Move to acceptedUser if Invited User is Creditor
        //Move to pendingUser if Invited User is Debitor
        await MoveInvitedToAccPenList(userId)
        // // add to user favourities for both initiator and new user
        await addToFavouritesIfTransactionCompleted(userId)
        //distribute Rs100 to top 3 invited users and 100 to joined user and send notification
        await sendBonusAndNotifiToTop3Invitors([userId], invitedby, phoneNumber)

        await setInvitationIdtoUserDocFirestore(userId, shadowUserId);
        await setInvitationStatusJoinedFirestore(shadowUserId)

    }

}




