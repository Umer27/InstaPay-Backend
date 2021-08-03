import {isShadowUser} from "../helper/ShadowUser";
import {createInstapayAccount, createInstapayUser} from "../helper/UserData";

exports.createAccount = async (req: any, res: any) => {

    const userData = req.body
    userData["userId"] = req.user.uid
    try {
        //check shadow user
        const shadowUser = await isShadowUser(userData.phoneNumber)
        if (shadowUser) {
            // delete from invited users and move to Users collection
           // await makeShadowUserInstapayUser(userData)
        } else {
            // if not create data on User and Account
            await createInstapayUser(userData)
            await createInstapayAccount({totalBalance: 0, userId: userData.userId})

        }
        res.status(200).send({message: "success"})
    } catch (err) {
        res.status(500).send({message: "server phat gya"})
    }


}
exports.createAccountTest = async (req: any, res: any) => {

    const userData = req.body
    userData["userId"] = "umer"
    try {
        //check shadow user
        const shadowUser = await isShadowUser(userData.phoneNumber)
        if (shadowUser) {
            // delete from invited users and move to Users collection
           // await makeShadowUserInstapayUser(userData)
        } else {
            // if not create data on User and Account
            await createInstapayUser(userData)
            await createInstapayAccount({totalBalance: 0, userId: userData.userId})

        }
        res.status(200).send({message: "success"})
    } catch (err) {
        res.status(500).send({message: "server phat gya"})
    }

}