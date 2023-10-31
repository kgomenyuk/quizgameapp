const { ScheduleManager } = require("./Scheduler");

// класс, который выполняет перенаправление запросов на сервис оповещений вместо изменений в репозитории
class ScheduleManagerProxy extends ScheduleManager{
    constructor(url){
        super();
        this.notifServiceURL = url;
    }

    // Создать повторяющееся уведомление. Вместо вызова библиотеки выполняем обращение к другому сервису
    async createNotification(userId, appId, nType, sInterval, isDateTime, repeat){
		// надо отправить запрос на сервер уведомлений
        try{
            const axReq = axiosBase(this.notifServiceURL);
            const axRes = await axReq.post("/", {
                appId: appId,
                userId:userId,
                nType:nType,
                nInterval: sInterval,
                datePlanning:isDateTime,
                repeat:repeat
            }, 
            {
                headers: {
                    "content-type":req.headers["content-type"],
                    "user-agent": req.headers["user-agent"]
                }
            });
            if(axRes.data.result == "ok"){
                // успешная обработка
                return axRes.data.notificationId;
            }else{
                // не было обработки, либо была ошибка
                return null;
            }
        }catch(exe){
            return null;
        }
	}

}

module.exports.ScheduleManagerProxy = ScheduleManagerProxy;