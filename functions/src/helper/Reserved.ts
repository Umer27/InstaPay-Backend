import * as admin from 'firebase-admin'

export async function reserveAckAmount(userId: string, ackUserAccountDoc: FirebaseFirestore.DocumentSnapshot,
                                       doc: FirebaseFirestore.DocumentSnapshot, ackAmount: number): Promise<void> {

    try {
        const data = doc.data()
        if (data)
            await admin.firestore().runTransaction(async t => {
                if (data.transactions[userId].source === 'instapay')
                    await t.update(ackUserAccountDoc.ref, {totalBalance: admin.firestore.FieldValue.increment(-ackAmount)})
                await t.update(ackUserAccountDoc.ref, {reservedBalance: admin.firestore.FieldValue.increment(ackAmount)})
                await t.update(doc.ref, {[`transactions.${userId}.reserved`]: true})
            })
    } catch (err) {
        console.log('Transaction failure:', err);
    }
}

export async function reserveAckAmountUser(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>, users: string[]): Promise<void> {

    try {
        const transData = doc.data()
        if (transData) {
            const initiatorId: string = transData.initiatorId
            for (const userId of users) {
                const ackUserAccountRef = await admin.firestore().collection("Instapay_Accounts").doc(initiatorId).get()
                const ackAmount = transData.transactions[userId].amount
                await admin.firestore().runTransaction(async t => {

                    if (transData.transactions[userId].source === 'instapay')
                        await t.update(ackUserAccountRef.ref, {totalBalance: admin.firestore.FieldValue.increment(-ackAmount)})
                    await t.update(ackUserAccountRef.ref, {reservedBalance: admin.firestore.FieldValue.increment(ackAmount)})
                    await t.update(doc.ref, {[`transactions.${userId}.reserved`]: true})
                })
            }
        }
    } catch (err) {
        console.log('Transaction failure:', err);
    }
}

export async function restoreUsersAckAmount(acceptedUsers: string[], data: FirebaseFirestore.DocumentData): Promise<void> {

    try {
        for (const user of acceptedUsers) {
            try {
                if ('reserved' in data.transactions[user]) {
                    const debitor = data.transactions[user].debitor
                    const amount = data.transactions[user].amount

                    const debRef = await admin.firestore().collection("Instapay_Accounts").doc(debitor)

                    await admin.firestore().runTransaction(async t => {

                        try {
                            await t.update(debRef, {reservedBalance: admin.firestore.FieldValue.increment(-amount)})
                            await t.update(debRef, {totalBalance: admin.firestore.FieldValue.increment(amount)})
                        } catch (err) {
                            console.log('Transaction failure:', err);
                        }

                    })
                }
            } catch (err) {
                console.log('restore User AckAmount:' + err)
            }
        }
    } catch (err) {
        console.log('restore Users AckAmount:' + err)
    }

}

