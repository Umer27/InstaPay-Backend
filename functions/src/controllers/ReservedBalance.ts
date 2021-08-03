import * as admin from "firebase-admin";

exports.ReservedBalance = async (request: any, response: any) => {
    try {
        const doc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
        const data = doc.data()
        if (data) {
            const acceptedUsers: string[] = data.acceptedUsers
            const initiatorId: string = data.initiatorId
            for (const userId of acceptedUsers) {
                if (!('reserved' in data.transactions[userId])) {
                    const ackUserAccountRef = await admin.firestore().collection("Instapay_Accounts").doc(initiatorId)
                    const ackAmount = data.transactions[userId].amount
                    await admin.firestore().runTransaction(async t => {
                        try {
                            if (data.transactions[userId].source === 'instapay')
                                await t.update(ackUserAccountRef, {totalBalance: admin.firestore.FieldValue.increment(-ackAmount)})
                            await t.update(ackUserAccountRef, {reservedBalance: admin.firestore.FieldValue.increment(ackAmount)})
                            await t.update(doc.ref, {[`transactions.${userId}.reserved`]: true})
                        } catch (err) {
                            console.log('Transaction failure:', err);
                        }
                    })
                }
            }
            response.status(200).send({message: 'Reserved Successful'})
        }
        response.status(401).send({message: 'Invalid Transaction'})
    } catch (err) {
        response.status(500).send({message: 'server phat gya'})
        console.log('Firestore Query Failed:', err);
    }
}