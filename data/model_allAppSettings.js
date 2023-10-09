const { default: mongoose } = require('mongoose');
const m = require('mongoose');

const CAppSettings = new m.Schema(
    {
        appAlias: String, // app alias
        settings:[
            {
                propertyName: String,
                propertyValue: String,
                propertyArray: mongoose.Schema.Types.Array
            }
        ],
        changedOn: Date
    }, {}
);

const MAppSettings = m.model("app_settings", CAppSettings);

module.exports={
    MAppSettings
};