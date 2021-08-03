import * as admin from "firebase-admin";

exports.auth = async (req: any, res: any) => {

    try{
        // const email = req.body.email;
        // const password = req.body.password;


    } catch (err) {

    }

    admin.auth().createCustomToken("umer").then((customToken) => {
        res.status(200).send({token: customToken})
    }).catch(err => {
        res.status(401).send({err: err})

    })

}