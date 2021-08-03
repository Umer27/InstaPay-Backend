import * as admin from "firebase-admin";
import {transactionNotification, userAcceptNotification, userRejectedNotification} from "../helper/notification";
import {UsersTransactions} from "../helper/Transaction";
import {addUserFavourites, Collection} from "../helper/Favourites";
import {reserveAckAmount, restoreUsersAckAmount} from "../helper/Reserved";
import {sendTwillioMsgToAllInvitedCreditors} from "../helper/Twillio";


exports.Transaction = async (request: any, response: any) => {
  try {
    const userId = request.user.uid
    const doc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
    const data = doc.data()
    if (data) {
      switch (data.transactionStatus) {

        case 'completed': {
          response.status(200).send({
            message: 'Already Completed Transaction'
          })
          break
        }
        case 'rejected': {              //if any user has already rejected the transaction
          response.status(200).send({
            rejectedUser: data.rejectedUser,
            message: 'Rejected Transaction'
          })
          break
        }
        case 'pending': {

          if (request.body.accepted) {

            let ackUserAccountDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
            let ackUserAccountData
            let ackAmount: number

            if (request.body.debitOnly) {
              ackUserAccountDoc = await admin.firestore().collection("Instapay_Accounts").doc(userId).get()
              ackUserAccountData = ackUserAccountDoc.data()
              ackAmount = data.debitBalance
            } else {
              ackUserAccountDoc = await admin.firestore().collection("Instapay_Accounts").doc(userId).get()
              ackUserAccountData = ackUserAccountDoc.data()
              ackAmount = data.transactions[userId].amount
            }

            if (ackUserAccountData) {
              if (ackUserAccountData.totalBalance > ackAmount) {
                if (!request.body.debitOnly)
                  await doc.ref.update({
                    pendingUsers: admin.firestore.FieldValue.arrayRemove(userId),
                    acceptedUsers: admin.firestore.FieldValue.arrayUnion(userId),
                    [`transactions.${userId}.transactionStatus`]: 'completed'
                  })

                //transaction
                if (data.pendingUsers.length <= 1 && data.invitedDebitors.length === 0) { //last user status updated

                  const acceptedUsers: string[] = data.acceptedUsers
                  if (!request.body.debitOnly) {
                    if (!acceptedUsers.includes(userId))
                      acceptedUsers.push(userId)
                  }

                  for (const user of acceptedUsers) {

                    const creditor = data.transactions[user].creditor
                    const debitor = data.transactions[user].debitor
                    const amount = data.transactions[user].amount

                    const credRef = await admin.firestore().collection("Instapay_Accounts").doc(creditor)
                    const debRef = await admin.firestore().collection("Instapay_Accounts").doc(debitor)
                    const creditorDoc = await admin.firestore().collection('Users').doc(creditor).get()
                    const debitorDoc = await admin.firestore().collection('Users').doc(debitor).get()

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
                    //invitors transactions
                    if (data.invitedCreditors.length > 0)
                      await UsersTransactions(data.invitedCreditors, data)

                    await admin.firestore().collection(`User_Favourites/${creditor}/favourites`).doc(debitor).set({
                      ...debitorDoc.data(),
                      transactionCount: admin.firestore.FieldValue.increment(1)
                    }, {merge: true})

                    await admin.firestore().collection(`User_Favourites/${debitor}/favourites`).doc(creditor).set({
                      ...creditorDoc.data(),
                      transactionCount: admin.firestore.FieldValue.increment(1)
                    }, {merge: true})
                  }

                  await transactionNotification(userId, data)
                  // send twillio msg to all invitedCreditors
                  await sendTwillioMsgToAllInvitedCreditors(data)

                  await doc.ref.update({
                    transactionStatus: 'completed',
                  })
                  const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
                  const updateData = updatedDoc.data()
                  response.status(200).send({
                    message: 'Transferred Successful',
                    transaction: updateData
                  })
                } else {

                  await admin.firestore().runTransaction(async t => {

                    try {
                      if (data.transactions[userId].source === 'instapay')
                        await t.update(ackUserAccountDoc.ref, {totalBalance: admin.firestore.FieldValue.increment(-ackAmount)})
                      await t.update(ackUserAccountDoc.ref, {reservedBalance: admin.firestore.FieldValue.increment(ackAmount)})
                      await t.update(doc.ref, {[`transactions.${userId}.reserved`]: true})
                    } catch (err) {
                      console.log('Transaction failure:', err);
                    }
                  })

                  await userAcceptNotification(userId, data)

                  const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
                  const updateData = updatedDoc.data()

                  response.status(200).send({
                    message: 'user accepted',
                    transaction: updateData
                  })

                }
              } else {
                response.status(402).send({message: 'Insufficient Balance'})
              }
            }
          } else {

            try {
              await doc.ref.update({
                transactionStatus: 'rejected',
                rejectedUser: {userId: userId, name: request.body.name},
                [`transactions.${userId}.transactionStatus`]: 'rejected'
              })

              const acceptedUsers: string[] = data.acceptedUsers
              if (!acceptedUsers.includes(userId))
                acceptedUsers.push(userId)

              for (const user of acceptedUsers) {
                if ('reserved' in data.transactions[user]) {
                  const debitor = data.transactions[user].debitor
                  const amount = data.transactions[user].amount

                  const debRef = await admin.firestore().collection("Instapay_Accounts").doc(debitor)

                  await admin.firestore().runTransaction(async t => {

                    try {
                      if (data.transactions[userId].source === 'instapay')
                        await t.update(debRef, {reservedBalance: admin.firestore.FieldValue.increment(-amount)})
                      await t.update(debRef, {totalBalance: admin.firestore.FieldValue.increment(amount)})
                    } catch (err) {
                      console.log('Transaction failure:', err);
                    }
                  })
                }
              }

              if (data.invitedCreditors.length > 0)
                await restoreUsersAckAmount(data.invitedCreditors, data)

              await userRejectedNotification(userId, data)

              const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
              const updateData = updatedDoc.data()

              response.status(200).send({
                message: 'Canceled Successful',
                transaction: updateData
              })
            } catch (err) {
              console.log('Canceled failed:', err);
            }

          }
        }

      }
    }
    response.status(401).send({message: 'Invalid Transaction'})
  } catch (err) {
    response.status(500).send({message: 'server phat gya'})
    console.log('Firestore Query Failed:', err);
  }
}

//Refactored Code
exports.TransactionRefactored = async (request: any, response: any) => {

  if (request.method === 'POST') {
    try {
      const transDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
      const transaData = transDoc.data()
      if (transaData) {
        switch (transaData.transactionStatus) {

          case 'completed': {
            response.status(200).send({
              message: 'Already Completed Transaction'
            })
            break
          }
          case 'rejected': {              //if any user has already rejected the transaction
            response.status(200).send({
              rejectedUser: transaData.rejectedUser,
              message: 'Rejected Transaction'
            })
            break
          }
          case 'pending': {

            if (request.body.accepted) {

              let ackUserAccountDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
              let ackUserAccountData
              let ackAmount: number

              if (request.body.debitOnly) {
                ackUserAccountDoc = await admin.firestore().collection("Instapay_Accounts").doc(request.body.userId).get()
                ackUserAccountData = ackUserAccountDoc.data()
                ackAmount = transaData.debitBalance
              } else {
                ackUserAccountDoc = await admin.firestore().collection("Instapay_Accounts").doc(request.body.userId).get()
                ackUserAccountData = ackUserAccountDoc.data()
                ackAmount = transaData.transactions[request.body.userId].amount
              }

              if (ackUserAccountData) {
                if (ackUserAccountData.totalBalance > ackAmount) {

                  if (!request.body.debitOnly)
                    await transDoc.ref.update({
                      pendingUsers: admin.firestore.FieldValue.arrayRemove(request.body.userId),
                      acceptedUsers: admin.firestore.FieldValue.arrayUnion(request.body.userId),
                      [`transactions.${request.body.userId}.transactionStatus`]: 'completed'
                    })

                  //transaction
                  if (transaData.pendingUsers.length <= 1 && transaData.invitedDebitors.length === 0) { //last user status updated

                    const acceptedUsers: string[] = transaData.acceptedUsers
                    if (!request.body.debitOnly) {
                      if (!acceptedUsers.includes(request.body.userId))
                        acceptedUsers.push(request.body.userId)
                    }

                    await UsersTransactions(acceptedUsers, transaData)
                    if (transaData.invitedCreditors.length > 0)
                      await UsersTransactions(transaData.invitedCreditors, transaData)

                    // invited creditors will move to fav when they join
                    await addUserFavourites(acceptedUsers, transaData, Collection.Users)

                    //Notification handling
                    // transaction successful notification sent to all involved users
                    await transactionNotification(request.body.userId, transaData)
                    // send twillio msg to all invitedCreditors
                    await sendTwillioMsgToAllInvitedCreditors(transaData)


                    await transDoc.ref.update({
                      transactionStatus: 'completed',
                    })

                    const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
                    const updateData = updatedDoc.data()

                    response.status(200).send({
                      message: 'Transferred Successful',
                      transaction: updateData
                    })

                  } else {
                    await reserveAckAmount(request.body.userId, ackUserAccountDoc, transDoc, ackAmount)

                    //Notification handling
                    // user accepted notification sent to only initiator
                    await userAcceptNotification(request.body.userId, transaData)

                    const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
                    const updateData = updatedDoc.data()

                    response.status(200).send({
                      message: 'user accepted',
                      transaction: updateData
                    })
                  }
                } else {
                  response.status(402).send({message: 'Insufficient Balance'})
                }
              }
            } else {

              try {
                await transDoc.ref.update({
                  transactionStatus: 'rejected',
                  rejectedUser: {userId: request.body.userId, name: request.body.name},
                  [`transactions.${request.body.userId}.transactionStatus`]: 'rejected'
                })

                const acceptedUsers: string[] = transaData.acceptedUsers
                if (!acceptedUsers.includes(request.body.userId))
                  acceptedUsers.push(request.body.userId)

                await restoreUsersAckAmount(acceptedUsers, transaData)
                if (transaData.invitedCreditors.length > 0)
                  await restoreUsersAckAmount(transaData.invitedCreditors, transaData)

                //Notification handling
                // transaction rejected notification sent to all involved users
                await userRejectedNotification(request.body.userId, transaData)
                // send Group transaction rejected twillio msg to all invitedCreditors(said no by kashif)

                const updatedDoc = await admin.firestore().collection("Transactions").doc(request.body.transactionId).get()
                const updateData = updatedDoc.data()

                response.status(200).send({
                  message: 'Canceled Successful',
                  transaction: updateData
                })
              } catch (err) {
                console.log('Canceled failed:', err);
              }

            }
          }

        }
      }
      response.status(401).send({message: 'Invalid Transaction'})
    } catch (err) {
      response.status(500).send({message: 'server phat gya'})
      console.log('Firestore Query Failed:', err);
    }
  } else {
    response.status(401).send({message: 'Only Post Request is allowed..U fucking bastard'})
  }
}
