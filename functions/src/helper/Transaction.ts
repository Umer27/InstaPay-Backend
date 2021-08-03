import * as admin from 'firebase-admin'

export async function UsersTransactions(acceptedUsers: string[], data: FirebaseFirestore.DocumentData): Promise<void> {

    try {
        for (const user of acceptedUsers) {
            try {
                const creditor = data.transactions[user].creditor
                const debitor = data.transactions[user].debitor
                const amount = data.transactions[user].amount

                const credRef = await admin.firestore().collection("Instapay_Accounts").doc(creditor)
                const debRef = await admin.firestore().collection("Instapay_Accounts").doc(debitor)

                await admin.firestore().runTransaction(async t => {

                    try {
                        await t.update(credRef, {totalBalance: admin.firestore.FieldValue.increment(amount)})

                        if ('reserved' in data.transactions[user])
                            await t.update(debRef, {reservedBalance: admin.firestore.FieldValue.increment(-amount)})
                        else if (data.transactions[user].source === 'instapay') {
                            await t.update(debRef, {totalBalance: admin.firestore.FieldValue.increment(-amount)})
                        }
                    } catch (err) {
                        console.log('Transaction failure:', err);
                    }

                })
            } catch (err) {
                console.log('User Transactions:' + err)
            }
        }
    } catch (err) {
        console.log('Users Transactions:' + err)
    }

}

export async function BonusTransaction(invitedBy: string[]): Promise<void> {

    const amount = 100 / invitedBy.length

    try {
        for (const user of invitedBy) {
            const credRef = await admin.firestore().collection("Instapay_Accounts").doc(user)
            const debRef = await admin.firestore().collection("Instapay_Accounts").doc("merchant")

            await admin.firestore().runTransaction(async t => {
                await t.update(credRef, {totalBalance: admin.firestore.FieldValue.increment(amount)})
                await t.update(debRef, {totalBalance: admin.firestore.FieldValue.increment(-amount)})

            })
        }
    } catch (err) {
        console.log('Users Transactions:' + err)
    }

}



