import * as admin from "firebase-admin";

exports.getfriendsTransaction = async (req: any, res: any) => {
    try {
        const userId = req.user.uid
        const userIds: string[] = []
        const transactions: FirebaseFirestore.DocumentData[] = []

        const favouriteDocs = await admin.firestore().collection('User_Favourites').doc(userId)
            .collection('favourites').orderBy('transactionCount', 'desc').limit(9)
            .get()

        userIds.push(userId)
        favouriteDocs.forEach((doc) => {
            if (doc.data().userId) {
                userIds.push(doc.data().userId)
            }
        })

        const transactionDocs = await admin.firestore().collection('Transactions')
            .where('involvedUsers', 'array-contains-any', userIds)
            .get()
        transactionDocs.forEach((doc) => {
            transactions.push(doc.data())
        })

        res.status(200).send({transactions: transactions})
    } catch (err) {
        res.status(500).send({message: 'server phat gya'})
        console.log('Firestore Query Failed:', err);
    }
}