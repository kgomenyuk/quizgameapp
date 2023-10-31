class Util {
	/** format date as YYYY-MM-DD
	*/
	static formatDate(date) {
	    var d = date,//new Date(date),
	        month = (d.getMonth() + 1),
	        day = d.getDate(),
	        year = d.getFullYear();
	
	        month = ("00"+month).slice(-2);
	        day = ("00"+day).slice(-2);
	
	    return [year, month, day].join('-');
	}


	static formatDateTimeTZMin(date, tzMin) {
	try{
	    var d = new Date(date);//new Date(date),
	    d.setMinutes(d.getMinutes() + tzMin);
	        var month = d.getMonth() + 1,
	        day = d.getDate(),
	        year =""+ d.getFullYear(),
	        hours = d.getHours(),
	        minutes = d.getMinutes(),
	        seconds = d.getSeconds();
			
			month = ("00"+month).slice(-2);
	        day = ("00"+day).slice(-2);
	        hours = ("00"+hours).slice(-2);
	        minutes = ("00"+minutes).slice(-2);
	        seconds = ("00"+seconds).slice(-2);
	
	    const txt_d = [year, month, day].join('-');
	    const txt_t = [hours, minutes, seconds].join(':');
	    return txt_d +" " + txt_t;
		}catch(ex){
			return "Unknown";
		}
	}
	
	static  createDateAsUTC(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	}
	
	static  createDateAsUTCFromString(dateStr) {
		if(dateStr == null){
			return null;
		}
		var date = new Date(dateStr);
    	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	}

	static  convertDateToUTC(date) { 
	    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); 
	}
	
	static formatDateTimeMinTZMin(date, tzMin) {
	try{
	    var d = Util.convertDateToUTC(new Date(date));//new Date(date),
	    d.setMinutes(d.getMinutes() + tzMin);
	        var month = d.getMonth() + 1,
	        day = d.getDate(),
	        year =""+ d.getFullYear(),
	        hours = d.getHours(),
	        minutes = d.getMinutes();
			
			month = ("00"+month).slice(-2);
	        day = ("00"+day).slice(-2);
	        hours = ("00"+hours).slice(-2);
	        minutes = ("00"+minutes).slice(-2);
	
	    const txt_d = [year, month, day].join('-');
	    const txt_t = [hours, minutes].join(':');
	    return txt_d +" " + txt_t;
		}catch(ex){
			return "Unknown";
		}
	}

	/** format date and time as YYYY-MM-DD HH:mm:ss or Unknown on error
	 */
	static formatDateTime(date) {
	try{
	    var d = new Date(date),//new Date(date),
	        month = ("00"+(d.getMonth() + 1)).slice(-2),
	        day = ("00"+d.getDate()).slice(-2),
	        year = ""+d.getFullYear(),
	        hours = ("00"+d.getHours()).slice(-2),
	        minutes = ("00"+d.getMinutes()).slice(-2),
	        seconds = ("00"+d.getSeconds()).slice(-2);

	    const txt_d = [year, month, day].join('-');
	    const txt_t = [hours, minutes, seconds].join(':');
	    return txt_d +" " + txt_t;
		}catch(ex){
			return "Unknown";
		}
	}
	
	/** format date and time as YYYYMMDDHHmmss
	 */
	static formatDateTimeString(y, m, d, hh, mm, ss) {
	try{
	    var 
	        month = ("00"+m).slice(-2),
	        day = ("00"+d).slice(-2),
	        year = ("0000"+y).slice(-4),
	        hours = ("00"+hh).slice(-2),
	        minutes = ("00"+mm).slice(-2),
	        seconds = ("00"+ss).slice(-2);

	    const txt_d = [year, month, day].join('');
	    const txt_t = [hours, minutes, seconds].join('');
	    return txt_d +"" + txt_t;
		}catch(ex){
			return null;
		}
	}
	
	// через x ...
	static formatDateTimeIntervalRel(dt, isReverse = false, onlyDays = false){
		const now = new Date();
		
		var res = [];
		// это разница в миллисекундах
		const dif = isReverse == true ? 
			(now.valueOf() - dt.valueOf())
			: (dt.valueOf() - now.valueOf());
		
		var d = 0; 
		var h = 0;
		var mm = 0;
		var s = 0;
		
		if(onlyDays == true){
			// показывать разницу только в днях и часах
			d = parseInt(dif / (24*60*60*1000));
			h = ( dif / (60*60*1000) % 24).toFixed(1);
		}else{
			d = parseInt(dif / (24*60*60*1000));
			h = parseInt(dif / (60*60*1000)) % 24;
			mm = parseInt(dif / (60*1000)) % 60;
			s = parseInt(dif / (1000)) % 60;
		}
		
		var found = false;
		// если не равно нул., то добавляем компонент в строку
		if(d!=0){
			res.push( `${d} д.`);
			found = true;
		}
		if(h!=0){
			res.push( `${h} ч.`);
			found = true;
		}
		if(mm!=0){
			res.push( `${mm} мин.`);
			found = true;
		}
		
		if(onlyDays == true){
			if(found == false){
				res.push( `1 м.`);
				found = true;
			}
		}else{
			if(s > 0 && found == false){
			res.push( `несколько секунд`);
			found = true;
			}
			
			if(s <= 0 && found == false){
				res.push( `пару мгновений`);
				found = true;
			}
		}
		
		
		if(found==true){
			return res.join(", ");
		}else{
			return ""
		}
	}
	
	/** format date and time as ds hrs mins
	 */
	static formatDateTimeRel(date) {
		try{
		    var d = new Date( date - new Date() );
	        var month = ( "00"+(d.getUTCMonth() + 1)).slice(-2),
	        day = ( "00"+d.getUTCDate()).slice(-2),
	        year = "" + ( d.getUTCFullYear() - 1970 ),
	        hours = ( "00"+d.getUTCHours()).slice(-2),
	        minutes = ( "00"+d.getUTCMinutes()).slice(-2),
	        seconds = ( "00"+d.getUTCSeconds()).slice(-2);
			
		    const txt_d = [year, month, day].join('-');
		    const txt_t = [hours, minutes, seconds].join(':');
		    return txt_d +" " + txt_t;
		}catch(ex){
			return "Unknown";
		}
	}
	
	static formatDateTimeSap(date) {
	try{
	    var d = new Date(date),//new Date(date),
	        month = ("00"+(d.getMonth() + 1)).slice(-2),
	        day = ("00"+d.getDate()).slice(-2),
	        year = ""+d.getFullYear(),
	        hours = ("00"+d.getHours()).slice(-2),
	        minutes = ("00"+d.getMinutes()).slice(-2),
	        seconds = ("00"+d.getSeconds()).slice(-2);

	    const txt_d = [year, month, day].join('-');
	    const txt_t = [hours, minutes, seconds].join(':');
	    return txt_d +"T" + txt_t + "Z";
		}catch(ex){
			return "Unknown";
		}
	}
	
	static formatDateTimeUTCSap(date) {
	try{
	    var d = new Date(date),//new Date(date),
	        month = ("00"+(d.getUTCMonth() + 1)).slice(-2),
	        day = ("00"+d.getUTCDate()).slice(-2),
	        year = ""+d.getUTCFullYear(),
	        hours = ("00"+d.getUTCHours()).slice(-2),
	        minutes = ("00"+d.getUTCMinutes()).slice(-2),
	        seconds = ("00"+d.getUTCSeconds()).slice(-2);

	    const txt_d = [year, month, day].join('-');
	    const txt_t = [hours, minutes, seconds].join(':');
	    return txt_d +"T" + txt_t + "Z";
		}catch(ex){
			return "Unknown";
		}
	}
	
	
}

module.exports.Util = Util;