import * as admin from 'firebase-admin'

export enum Collection {
    Users = 'Users',
    InvitedUsers = 'Invited_Users'
}

export async function addUserFavourites(acceptedUsers: string[], data: FirebaseFirestore.DocumentData, collection: string): Promise<void> {
    try {
        for (const user of acceptedUsers) {

            try {
                const creditor = data.transactions[user].creditor
                const debitor = data.transactions[user].debitor

                const creditorDoc = await admin.firestore().collection(collection).doc(creditor).get()
                const debitorDoc = await admin.firestore().collection(collection).doc(debitor).get()

                await admin.firestore().collection(`User_Favourites/${creditor}/favourites`).doc(debitor).set({
                    ...debitorDoc.data(),
                    transactionCount: admin.firestore.FieldValue.increment(1)
                }, {merge: true})

                await admin.firestore().collection(`User_Favourites/${debitor}/favourites`).doc(creditor).set({
                    ...creditorDoc.data(),
                    transactionCount: admin.firestore.FieldValue.increment(1)
                }, {merge: true})
            } catch (err) {
                console.log('add User Favourite:' + err)
            }
        }
    } catch (err) {
        console.log('add Users Favourites:' + err)
    }
}