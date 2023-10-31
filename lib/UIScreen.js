const { Context } = require("telegraf");
const crypto = require("crypto");

/**
 * Message in the bot
 */
class UIMessage {
	static debug = false;
	screenTag = "";
	/**
	 * 
	 * @param {String} t Template
	 * @param {String} tag Message tag
	 * @param {[{id: string, value: string}]} arr Array of items to be shown in the message
	 * @param {[[String]]} ph Placeholders [k, v], [k, v] ...
	 * @param {[UIButtonPlace]} btnpl Places for buttons
	 */
	constructor(t, tag, arr, ph, btnpl){
		this.template = t;
		if(arr){
			this.array = arr;
		}
		if(tag!=null){
			this.tag = tag;
		}
		if(ph){
			ph.sort((a, b)=>{
				if(a[2] != null && b[2] != null){ 
					return - a[2].start + b[2].start;
				}else{
					return a[0] > b[0];
				}
			});

			//ph.sort((a, b)=> a[0] > b[0]);
			this.placeholders = ph;
			this.dictPlaceholders = ph.reduce((p, c, i)=>{
				p[c[0]] = {
					name: c[0],
					description:c[3],
					coords:c[2],
					initial: c[4],
					index: i
				};
				return p;
			}, {});
		}
		if(btnpl){
			// save all button places
			this.buttonPlaces = btnpl;

			
		}
	}

	/**
	 * Calculate hash and detect changes
	 * @param {Boolean} save
	 * @returns { {hash: String, hText:string, hButtons:String, chText:Boolean, chButtons:Boolean, changed:Boolean} }
	 */
	getHash = (save)=>{
		const d1 = this.toText();
		const d2 = JSON.stringify(this.getTgButtons());
		const data = d1 + d2;
		const h1 = crypto.createHash('md5').update(d1).digest("hex");
		const h2 = crypto.createHash('md5').update(d2).digest("hex");

		const hash = crypto.createHash('md5').update(data).digest("hex");
		const res = {
			hash: hash,
			hText: h1,
			hButtons: h2,
			chText: this.postedHashText != h1,
			chButtons: this.postedHashButtons != h2,
			changed: hash != this.postedHash
		};
		if(save == true){
			this.postedHash=hash;
			this.postedHashText = h1;
			this.postedHashButtons = h2;
		}
		return res;
	};


	/**
	 * 
	 * @param {String} reference 
	 * @param {[{code:String, text:String}]} value 
	 */
	setBtnPlace = (reference, value) => {
		var pl = this.buttonPlaces.find(x=>x.reference == reference);
		if(pl != null){
			pl.setData(value);
		}
	}

	/**
	 * Template of a message. Can include {{?}} (only one) and {{<PLACEHOLDERNAME>}} (many)
	 */
	template="";
	/**
	 * message ID in the bot
	 */
	id=0;

	tag="";

	/**
	 * @type {[{id:string, value:string}]} List in the message
	 */
	array=[];

	/**
	 * @type {[[UIButton]]}
	 */
	buttonsTable=[];

	/** All placeholders [name, value], [,]...
	 * @type {[[string]]}
	 */
	placeholders=[];

	/** 
	 * the message was already sent
	 */
	isPosted = false;

	/**
	 * when the message was sent
	 */
	timePosted = new Date();

	/**
	 * MD5 hash of posted message
	 */
	postedHash = "";


	postedHashButtons = "";


	postedHashText = "";

	/**
	 * Number of times the message was refreshed
	 */
	refreshCount = 0;


	/**
	 * Message will be hidden once deleted
	 */
	isHidden = false;

	/**
	 * 
	 */
	fillInitial = () => {
		for (const ph of this.placeholders) {
			ph[1] = ph[4];
		}
	}

	deleteMessage = () =>{
		this.isHidden = true;
	};

	unDeleteMessage = () =>{
		this.isHidden = false;
		this.id = 0;
	};

	/**Produce text content for the message
	 * @param {Boolean} withArrayIndex Add array index to the list
	 */
	toText=(withArrayIndex)=>{
		const listText = this.array.map((x, i)=>{
			if(withArrayIndex == true){
				return `${i+1}. ${ x.value } `;
			}else{
				return `${ x.value } `;
			}
		})
		.join("\n");
		if(listText!=null){
			var arrPH = this.placeholders.find(p=>p[0] == "?");
			if(arrPH){
				arrPH[1] = listText;
			}
		}

		var messageText = this.array.length>0
			? this.template.replace("{{?}}", listText)
			: this.template.replace("\n{{?}}", "").replace("{{?}}", "");

		if(this.placeholders!=null){
			var phArray = 
			/*this.placeholders.sort((a, b)=>{
				if(a[2] != null && b[2] != null){ 
					return - a[2].start + b[2].start;
				}else{
					return a[0] > b[0];
				}
			});*/
				this.placeholders;

			for (const p of phArray) {
				if(p[2] != null){
					var coords = p[2];
					messageText = 
						messageText.substring(0, coords.start)
						+ p[1] 
						+ messageText.substring(coords.end);
				}else{
					messageText = messageText.replace("{{"+p[0]+"}}", p[1]);
				}
			}
		}

		if(UIMessage.debug == true){
			
			messageText = this.screenTag 
				+ "\n" + this.tag 
				+ "\n" + messageText;
		}

		return messageText;
	}

	addItem = (id, value) => {
		if(id != "" && value != ""){
			this.array.push({id: id, value: value});
			return true;
		}else{
			return false;
		}
	}

	removeItem = (id) => {
		if(id != null){
			const idx = this.array.findIndex( item=>item.id == id);
			if(idx > -1){
				this.array.splice(idx, 1);
				return true;
			}else{
				return false;
			}
		}else{
			return false;
		}
	}

	createButtonsTable = () => {
		this.buttonsTable = [];
		if(this.buttonPlaces.length == 0){
			return;
		}
		var btns = [];
		var btnRow = [];
		var btnTab = [];
		var rowIdx = 0;
		var lineIndexPrev = 0;
		var btnIdx = 0;
		this.buttonPlaces.sort((a,b)=>(a.lineIndex > b.lineIndex) && (a.index> b.index));
		
		btnRow = [];
		btnIdx = 0;
		btnTab.push(btnRow);
		
		for(const row of this.buttonPlaces){

			if(lineIndexPrev != row.lineIndex && btnRow.length > 0){
				// start a new row
				btnRow = [];
				btnIdx = 0;
				btnTab.push(btnRow);
				rowIdx += 1;
			}
			lineIndexPrev = row.lineIndex;

			for(const btn of row.buttons.filter(x=>x.isHidden == false)){

				if( row.isArray == true && btnIdx >= row.maxInLine && btnRow.length > 0){
					btnRow = [];
					btnIdx = 0;
					btnTab.push(btnRow);
					rowIdx += 1;
				}

				btn.row = rowIdx;
				btn.col = btnIdx;

				btns.push(btn);
				btnRow.push(btn);

				btnIdx += 1;
			}
			
		}

		this.buttonsTable = btnTab;
		this.buttons = btns;
	}

	/**
	 * 
	 * @returns {[[{text:String, callback_data:String}]]}
	 */
	getTgButtons = () => {
		return this.buttonsTable.map(x=>{
			return x.map(x2=>x2.toTG());
		});
	};

	/**
	 * Hide all buttons under the message
	 */
	hideAllButtons = () => {
		this.buttons.forEach(x=>{
			x.hide();
		});
	}

	/**
	 * Change text of a placeholder
	 */
	setPlaceholder = (ph, value) => {
		if(this.dictPlaceholders[ph] != null){
			const idx = this.dictPlaceholders[ph].index;
			this.placeholders[idx][1] = value;
			return true;
		}else{
			return false;
		}
	};

	getButtons = (btn) => {
		return this.buttons.filter(x=>x.reference == btn);
	};
}

class UIButtonPlace{
	isArray = false;
 	reference = "";
	text = "";
	maxInLine = 1;
	index = 0;
	lineIndex = 0;
	code = "";

	/**
	 * @type {[UIButton]}
	 */
	buttons = [];
	
	/**
	 * @returns {UIButton}
	 */
	toButton = () => {
		var b1 = new UIButton();
		b1.code=this.code;
		b1.text=this.text;
		b1.reference = this.reference;
		return b1;
	};

	createButton = () => {
		if(this.isArray == false){
			this.buttons=[];
			const b = this.toButton();
			this.buttons.push(b);
		}
	};

	/**
	 * 
	 * @param {[{text:String, code:String}]} btns 
	 */
	toButtons = (btns) => {
		var bs = btns.map(x=>{
			var b1 = new UIButton();
			b1.code=x.code;
			b1.text=x.text;
			b1.reference = this.reference;
			return b1;
		});
		return bs;
	};

	/**
	 * @param {{text:String, code:String} | [{text:String, code:String}]} val
	 */
	setData = (val) => {
		if(Array.isArray(val) == true){
			// array of buttons
			val.forEach((x, i)=>{
				var b = this.buttons
					.find(z=>z.code == x.code);
				if(b == null){ 
					b = new UIButton();
					b.code = x.code;
					b.text = x.text;
					b.reference = this.reference;
					this.buttons.push(b);
				}else{
					b.change(x.text, x.code);
				}
			});
			
		}else{
			var b = this.buttons[0];
			b.change(val.text, val.code);
		}
	};
	
}

// Bot interface elements
class UIButton{
	text = "";
	code = "";
	row = 0;
	col = 0;
	reference = "";
	isHidden = false;

	constructor(){
		this.isChanged=false;
	}
	/**
	 * 
	 * @param {String} t text 
	 * @param {String} c code of the button
	 */
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

	hide = () => {
		if(this.isHidden == false){
			this.isHidden = true;
			this.isChanged = true;
		}
	}

	unhide = () => {
		if(this.isHidden == true){
			this.isHidden = false;
			this.isChanged = true;
		}
	}

	/**
	 * TG button under message
	 * @returns {text: String, callback_data:String} 
	 */
	toTG = () => {
		return {text: this.text, callback_data: this.code };
	}
}
/**
 * default message = main
 * other messages will have tags
 * several messages can have the same tag
 * 
 * Syntax:
 * # MESSAGE_GROUP_CODE
 * ## MESSAGE_CODE
 * message contents
 * ....
 * message contents
 * contens with {{ PLACEHOLDER Name of ph | initial value }}
 * 
 * 
 * 
 * {{ - starts the placeholder
 * }} - finishes the placeholder
 * | - symbol before initial value of a placeholder
 * First word after {{ - Code name of the placeholder
 * Words before | - Description of the placeholder
 */
class UIScreen{

	/**
	 * Screen identifier
	 */
	screenTag = "default";

	/**
	 * @type {[UIMessage]}
	 */
	messages = [];

	/**
	 * Chat
	 */
	chatId = 0;

	/**
	 * Debug mode
	 * @type {Boolean}
	 */
	debug = false;

	// regular expressions for parsing of message definitions
	static msgGroupExp = /(?<=[#]{1,1}[ ]*)[^# ].*(?=[ ]*)/;
    static msgExp = /(?<=[#]{2,2}[ ]*)[^# ].*(?=[ ]*)/;
    static phExp = /{{[ ]*(?<name>[^ ]*)[ ]*(?<decription>[^{}|]*)[ |]*(?<initial>[^{}]*)}}/mgi;
	static buttonExp = /{{[ ]*(?<code>[^|]*)[|](?<text>[^{}|]*)[|]*(?<reference>[^{}]*)}}/mgi;


	constructor(debug){
		this.captionMsgId=0;
		//this.messageIds=[];
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

	static traceLog = [];
	static writeTraceLog(txt) {
		UIScreen.traceLog.push({ dt:new Date(), text:txt } );
	};

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
	 * @param {[UIMessage]} arrMessages 
	 */
	setMessages = (arrMessages) => {
		arrMessages
		.forEach(el => {
			var mi = this.messages.findIndex(x=>x.tag == el.tag);
			/*if(m!=null){
				m.id=el.id;
				m.template=el.template;
				m.array = el.array;
				m.placeholders = el.placeholders;
				m.buttonPlaces = el.buttonPlaces;
			}*/
			if(mi>-1) {
				this.messages.splice(mi, 1, el);
			}else{
				this.messages.push(el);
			}
		});
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
	 * Remove the buttons under the message
	 * @param { String } msgTag 
	 * @param {Context} ctx
	 */
	dropButtonsTg = async (msgTag, ctx)=>{
		const msg = this.messages.find(m=>m.tag == msgTag);
		
		try{
			const msgId = msg.id;
			const chat = this.chatId;

			await ctx.telegram.editMessageReplyMarkup(chat, msgId, null, {
					reply_markup:{
					}
				});
			}catch(e){
				console.log(e);
			}
	}
	/**
	 * Update the contents of the message
	 * @param { String } msgTag 
	 * @param {Context} ctx
	 */
	refreshPostTg = async (msgTag, ctx, inlineKeyboard, dropKeyboard) =>{
		const msg = this.messages.find(m=>m.tag == msgTag);
		
		try{
			const msgId = msg.id;
			const chat = this.chatId;

			if(inlineKeyboard!=null){
				await ctx.telegram.editMessageText(chat, msgId, null, msg.toText(), {
						reply_markup:{ 
							inline_keyboard:inlineKeyboard
						}
					});
			}else if (dropKeyboard == null) {
				await ctx.telegram.editMessageText(chat, msgId, null, msg.toText());
			} else{
				await ctx.telegram.editMessageText(chat, msgId, null, msg.toText(), {
					reply_markup:{
					}
				});
			}
			}catch(e){
				console.log(e);
			}
	};

	/**
	 * Update message in TG
	 * @param {Context} ctx 
	 * @param {String} msgTag 
	 */
	updateMessage = async (ctx, msgTag) => {
		var msg = this.getMessage(msgTag);
		msg.createButtonsTable();

		if(msg.isPosted==false){
			// error
			var logTxt = "UPDATE_MESSAGE " + msgTag + " Has not been sent yet";
			UIScreen.writeTraceLog(logTxt);
			return false;
		}else{
			var newhash = msg.getHash(true);
			const msgId = msg.id;
			if(newhash.changed == false){
				// no changes
				var logTxt = "UPDATE_MESSAGE " + msgTag + " " + msgId + " Was not changed";
				UIScreen.writeTraceLog(logTxt);
				return true;
			}
			try{
				const chat = this.chatId;
				const text = msg.toText();
				if(newhash.chButtons == true||newhash.chText==true){
					const inlineKeyboard = msg.getTgButtons();
					if(this.debug == true){
						var logTxt = "UPDATE_MESSAGE " + msgTag + " " + msgId + "\n"
							+ newhash.chText + " " + newhash.chButtons + " \n"
							+ text + "\nBUTTONS\n"
							+ JSON.stringify(inlineKeyboard);
						UIScreen.writeTraceLog(logTxt);
					}else{
						if(newhash.chText == true){
							await ctx.telegram.editMessageText(chat, msgId, null, text, {
									reply_markup:{ 
										inline_keyboard:(inlineKeyboard.length == 0 ? null : inlineKeyboard)
									}
								});
						}else{
							await ctx.telegram.editMessageReplyMarkup(chat, msgId, null, {
									inline_keyboard:(inlineKeyboard.length == 0 ? null : inlineKeyboard)
								});
						}
					}
					msg.refreshCount += 1;
				}
			}catch(e){
				console.log(e);
			}
			return true;
		}
	};

	/**
	 * Hide the message
	 * @param {Context} ctx
	 * @param {String} msgTag 
	 */
	deleteMessage = async (ctx, msgTag) =>{
		//
		var msg = this.getMessage(msgTag);
		

		if(msg!=null && msg.isPosted==true && msg.isHidden == false ){
			var msgId = msg.id;
			msg.deleteMessage();
			const userId = this.chatId;
			if(this.debug == true){
				var logTxt = "DELETE_MESSAGE " + msgTag + " " + msgId + " ";
				if(buttons!=null && buttons.length>0){
					logTxt = logTxt + "\n buttons:\n" 
						+ JSON.stringify(buttons);
				}
				UIScreen.writeTraceLog(logTxt);
			} else {
				await ctx.telegram.deleteMessage(userId, msgId);
			}
			msg.isPosted = false;
			return true;
		}else{
			UIScreen.writeTraceLog("DELETE_MESSAGE Message is not available: " + msgTag);
			return false;
		}
	}

	addLineTg = async (msgTag, ctx, line)=>{
		const msg = this.messages.find(m=>m.tag == msgTag);
		
		try{
			const msgId = msg.id;
			const chat = this.chatId;
			const n = msg.array.length;
			msg.array.push({ id:n+"", value: line });
			const text = msg.toText();

			await ctx.telegram.editMessageText(chat, msgId, null, text);
		}catch(e){
			console.log(e);
		}
	}
	/**
	 * Find a message and return it
	 * @param { String } msgTag
	 * @returns { UIMessage }
	 */
	getMessage = (msgTag) => {
		return this.messages.find(m=>m.tag == msgTag);
	};
/**
 * 
 * @param {*} tag 
 * @param {Context} ctx 
 */
	dropPostTg = async (msgTag, ctx) => {
		const chatId = this.chatId;
		const msg = this.messages.find(m=>m.tag == msgTag);
		const msgIdx = this.messages.findIndex(m=>m.tag == msgTag);
		const msgId = msg.id;

		await ctx.telegram.deleteMessage(chatId, msgId);
		this.messages.splice(msgIdx, 1);
	}

	/**
	 * 
	 * @param {*} msgTag 
	 * @param {Context} ctx 
	 * @param {{id: String, value: String}} item 
	 */
	arrayAddItemTg = async (msgTag, ctx, item) =>{
		const msg = this.messages.find(m=>m.tag == msgTag);
		try{
			if(item!=null && item.id != "" && item.value != ""){
				msg.addItem(item.id, item.value);
				const messageText = msg.toText();
				await ctx.telegram.editMessageText(this.chatId, msg.id, null, messageText);
				return true;
			}else{
				console.log("incorrect item");
			}
		}catch(e){
			console.log(e);
		}
		return false;
	}
	/**
	 * 
	 * @param {*} msgTag 
	 * @param {Context} ctx 
	 * @param {{id: String, value: String}} item 
	 */
	arrayRemoveItemTg= async (msgTag, ctx, id) =>{
		const msg = this.messages.find(m=>m.tag == msgTag);
		try{
			if( id != null ){
				const res = msg.removeItem(id);
				if(res==true){
					await this.refreshPostTg(msgTag, ctx);
				}
				return true;
			}else{
				console.log("incorrect item");
			}
		}catch(e){
			console.log(e);
		}
		return false;
	}


	/**
	 * find the button that was pressed
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

	/**
	 * Finds message group id
	 * @param {String} msgDef
	 * @returns {String} Message group ID
	 */
	static getIdFromDefinition(definition){
		const lines = definition.split("\n");
		const msgGroup = lines[0];	
		var msgGroupRes = UIScreen.msgGroupExp.exec(msgGroup);
		return msgGroupRes[0];
	}

	/** Create from text definition
	 * @param { String } definition Description of a message
	 * @param {Boolean} createButtons Create buttons table automatically
	 * @returns { UIMessage } The new message
	 */
	fromTextDefinition(definition, createButtons){

		const lines = definition.split("\n");
		// 1 line = message group
		// 2 line = message
		// 3->=== = contents

		const msgGroup = lines[0];	
		const msg = lines[1];

		var msgGroupRes = UIScreen.msgGroupExp.exec(msgGroup);
		var msgRes = UIScreen.msgExp.exec(msg);
		this.screenTag = msgGroupRes[0];
		const messageTag = msgRes[0];

		const texts = lines.reduce((p, c, i)=>{
			if(i<2){
				return p;
			}else if( p.eot == true) {
				// buttons
				p.buttonLines.push(c);
				return p;
			}else{
				if(c == '==='){
					p.eot = true;
					return p;
				}
				p.textLines.push(c);
				return p;
			}
		}, { eot: false, textLines:[], buttonLines:[] });

		const textArray = texts
			.textLines;
		const buttonArray = texts
			.buttonLines;

		// there must be at least 1 line with text
		const valid = (textArray.length >= 1);

		// parse placeholders
		const arrayPH = [];
		var templates = [];
		var len = 0;
		textArray.forEach((v, i) => {
			templates.push(v);
			// placeholders?
			var match = null;
			while ((match = UIScreen.phExp.exec(v)) != null ) {
				const name = match.groups.name;
				const coords = { 
					start: len + match.index,
					end: len + match.index + match[0].length,
					length: UIScreen.phExp.source.length,
					offset: len
				};
				var description = match.groups.description;
				var initial = match.groups.intial;
				if(description == null){ description = ""; }
				if(initial == null){ initial = ""; }

				arrayPH.push({ name, description, coords, initial });
			}
			len += v.length + 1;
		});

		const template = templates.join('\n');
		const messagePH = arrayPH.map(p => [p.name, p.initial, p.coords, p.description, p.initial]);

		// 
		// parse buttons info
		var buttons = [];
		var btnIndex=0;
		var btnLine=0;
		buttonArray.forEach((v, i) => {
			var match = null;
			while(( match = UIScreen.buttonExp.exec(v) ) != null ) {
				const code = match.groups.code.trim();
				const text = match.groups.text.trim();
				const reference = match.groups.reference.trim();
				if(code == "?"){
					var b = new UIButtonPlace(); 
					b.isArray= true;
					b.reference=reference;
					b.text="";
					b.maxInLine= text;
					b.index= btnIndex;
					b.lineIndex= btnLine;
					buttons.push(b);
				}else{
					var b = new UIButtonPlace(); 
					b.isArray= false;
					b.reference=reference;
					b.text=text;
					b.code= code;
					b.index= btnIndex;
					b.lineIndex= btnLine;
					b.createButton();
					buttons.push(b);
				}
				btnIndex += 1;
			}
			btnLine += 1;
		});

		var message = new UIMessage(template, messageTag, [], messagePH, buttons);
		message.screenTag = this.screenTag;

		this.setMessages([message]);
		if(createButtons == true){
			message.createButtonsTable();
		}

		return message;
		
	}

	

	/**
	 * Send message to the user in Telegram
	 * @param {Context} ctx 
	 * @param {String} msgTag 
	 * @param {String} userId
	 */
	postMessage = async (ctx, msgTag, userId) => {
		const msg = this.getMessage(msgTag);
		if(msg==null){
			UIScreen.writeTraceLog("POST_MESSAGE Message does not exist: " + msgTag);
			return false;
		}
		if(msg.isPosted == true){
			UIScreen.writeTraceLog("POST_MESSAGE Message was already posted: " + msgTag);
			return false;
		}
		var msgId = Date.now();
		var text = msg.toText();
		var buttons = msg.getTgButtons();
		if(msg.isHidden == true){
			msg.unDeleteMessage();
			
			UIScreen.writeTraceLog("POST_MESSAGE Deletion flag was removed: " + msgTag);
		}

		if(this.debug == true){
			var logTxt = "POST_MESSAGE " + msgId + " " + text;
			if(buttons!=null && buttons.length>0){
				logTxt = logTxt + "\n buttons:\n" 
					+ JSON.stringify(buttons);
			}
			UIScreen.writeTraceLog(logTxt);
		}else{
			
			if(buttons!=null && buttons.length>0){
				var m = await ctx.telegram.sendMessage(userId, text, {
					reply_markup:{
						inline_keyboard:buttons
					}
				});
				msgId = m.message_id;
			}else{
				var m = await ctx.telegram.sendMessage(userId, text);
				msgId = m.message_id;
			}
		}
		msg.id = msgId;
		msg.isPosted = true;
		msg.timePosted = new Date();
		msg.getHash(true);

		return true;
	};
}

module.exports = {
    UIScreen,
    UIButton,
	UIMessage
};