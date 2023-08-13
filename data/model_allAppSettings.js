const m = require('mongoose');

const CAppSettings = new m.Schema(
    {
        appAlias: String, // app alias
        settings:[
            {
                propertyName: String,
                propertyValue: String
            }
        ],
        changedOn: Date
    }
);

const MAppSettings = m.model("app_settings", CAppSettings);

module.exports={
    MAppSettings
};