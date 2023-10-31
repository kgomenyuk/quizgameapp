const { MProfile } = require("../model");

async function getProfile(userId){
    var d_u
        = await MProfile.findOne({
            id: userId
        });
    return d_u;
};

async function getStaff(){
    var arr_d_u
        = await MProfile.find({
            userRoles: "staff"
        });
    return arr_d_u;
};

async function ensureUser({id, fname, sname, login, role, lang}) {

    const c = await MProfile.findOne({ id: id + "" }, {_id:0});

    if(c == null){
        // user not found in the database
        await MProfile.create({
            id: id, 
                fName:fname,
                login:login,
                fullName: (fname?"":fname + " ") + (sname?"":sname),
                userRole:role,
                sName:sname,
                lang: lang,
                createdDTTM: new Date(),
                timZone: 0
        });

        return {id, fname, sname, login, role, lang};
    }else{
        return c.toObject();
    }
};


module.exports = {
    getProfile,
    getStaff,
    ensureUser
};