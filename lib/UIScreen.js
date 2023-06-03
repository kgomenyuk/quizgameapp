// интерфейс приложения в боте
class UIButton{
	constructor(){
		this.text="";
		this.code="";
		this.isChanged=false;
	}
	change(t, c){
		if(t !=null){
			if(t!=this.text){
				this.isChanged=true;
				this.text=t;
			}
		}
		if(c!=null){
			if(c!=this.code){
				this.isChanged=true;
				this.code=c;
			}
		}
	}
}
class UIScreen{
	constructor(){
		this.captionMsgId=0;
		this.messageIds=[];
		/**
		 * @type {[UIButton]}
		 */
		this.buttons=[];
		/**
		 * @type {UIButton}
		 */		
		this.currentButton=null;
		this.btnTable = [];
		this.currentMessageId = 0;
		/**
		 * @type {Object<string, UIButton>}
		 */
		this.btnDict = {};
		this.mode = "";
	}

	/**
	 * 
	 * @returns {[{text: String, callback_data: String}]}
	 */
	getTGInlineKeyboard(){
		var btnRow = [];
		var btnTab = [];
		for(const row of this.btnTable){
			btnRow=[];
			btnTab.push(btnRow);
			for(const btn of row){
				var lbtn = {
					callback_data: btn.code,
					text: btn.text
				};

				btnRow.push(lbtn);
			}
		}

		return btnTab;
	}
	/**
	 * 
	 * @param {[[{text: String, callback_data: String}]]} ilk 
	 * @returns {[UIButton]}
	 */
	fromTGInlineKeyboard(ilk){
		var btns = [];
		var btnRow = [];
		var btnTab = [];
		for(const row of ilk){
			btnRow=[];
			btnTab.push(btnRow);
			for(const btn of row){
				var lbtn = new UIButton();
				lbtn.code = btn.callback_data;
				lbtn.text = btn.text;

				btns.push(lbtn);

				btnRow.push(lbtn);
			}
		}

		this.buttons = btns;
		this.btnTable = btnTab;
		this.btnDict = this.buttons.reduce((p, x)=>{
			p[x.code] = x;
			return p;
		}, {});
	}

	fromTGMessage(msg, btnCode){
		this.currentMessageId = msg.message_id;
		if(msg.reply_markup && msg.reply_markup.inline_keyboard){
			this.buttons=[];
			this.btnTable=[];
			this.btnDict={};
			this.fromTGInlineKeyboard(msg.reply_markup.inline_keyboard);
			this.currentButton = null;
			if(btnCode!=null){
				this.identifyButton(btnCode);
			}
		}
	}

	toTGMessage(){
		
	}

	/**
	 * найти нажатую кнопку по полученному коду
	 * @returns {Boolean}
	 */
	identifyButton(code){
		if(this.btnDict[code]!=null){
			// что-то нашли
			const btn = this.btnDict[code];
			this.currentButton = btn;
			return true;
		}
		return false;
	}

	setMode(txtMode){
		this.mode  =txtMode;
	}
}

module.exports = {
    UIScreen,
    UIButton
};