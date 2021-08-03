import {addToFavouritesIfTransactionCompleted} from "../helper/ShadowUser";

exports.testMessages = async (req: any, res: any) => {

    try {

        await addToFavouritesIfTransactionCompleted("umer")

        res.status(200).send({mess: "success"})
    } catch (err) {
        res.status(500).send({err: err})
    }

}