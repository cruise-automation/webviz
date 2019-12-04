!function(modules){var installedModules={};function __webpack_require__(moduleId){if(installedModules[moduleId])return installedModules[moduleId].exports;var module=installedModules[moduleId]={i:moduleId,l:!1,exports:{}};return modules[moduleId].call(module.exports,module,module.exports,__webpack_require__),module.l=!0,module.exports}__webpack_require__.m=modules,__webpack_require__.c=installedModules,__webpack_require__.d=function(exports,name,getter){__webpack_require__.o(exports,name)||Object.defineProperty(exports,name,{enumerable:!0,get:getter})},__webpack_require__.r=function(exports){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(exports,"__esModule",{value:!0})},__webpack_require__.t=function(value,mode){if(1&mode&&(value=__webpack_require__(value)),8&mode)return value;if(4&mode&&"object"==typeof value&&value&&value.__esModule)return value;var ns=Object.create(null);if(__webpack_require__.r(ns),Object.defineProperty(ns,"default",{enumerable:!0,value:value}),2&mode&&"string"!=typeof value)for(var key in value)__webpack_require__.d(ns,key,function(key){return value[key]}.bind(null,key));return ns},__webpack_require__.n=function(module){var getter=module&&module.__esModule?function(){return module.default}:function(){return module};return __webpack_require__.d(getter,"a",getter),getter},__webpack_require__.o=function(object,property){return Object.prototype.hasOwnProperty.call(object,property)},__webpack_require__.p="/dist/",__webpack_require__(__webpack_require__.s=12)}([
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_nativeCreate.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var nativeCreate=__webpack_require__(/*! ./_getNative */10)(Object,"create");module.exports=nativeCreate},
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_assocIndexOf.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var eq=__webpack_require__(/*! ./eq */42);module.exports=function(array,key){for(var length=array.length;length--;)if(eq(array[length][0],key))return length;return-1}},
/*!*****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_getMapData.js ***!
  \*****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var isKeyable=__webpack_require__(/*! ./_isKeyable */48);module.exports=function(map,key){var data=map.__data__;return isKeyable(key)?data["string"==typeof key?"string":"hash"]:data.map}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/isObject.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(value){var type=typeof value;return null!=value&&("object"==type||"function"==type)}},
/*!***********************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_root.js ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var freeGlobal=__webpack_require__(/*! ./_freeGlobal */20),freeSelf="object"==typeof self&&self&&self.Object===Object&&self,root=freeGlobal||freeSelf||Function("return this")();module.exports=root},
/*!******************************************************!*\
  !*** ./packages/webviz-core/src/util/reportError.js ***!
  \******************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.setErrorHandler=function(handler){if(addError!==defaultErrorHandler)throw new Error("Tried to overwrite existing ErrorHandler");addError=handler,0},exports.unsetErrorHandler=function(){if(addError===defaultErrorHandler)throw new Error("Tried to unset ErrorHandler but it was already the default");addError=defaultErrorHandler},exports.detailsToString=function(details){if("string"==typeof details)return details;if(details instanceof Error)return details.toString();return"unable to convert details to string type"},exports.default=reportError;const defaultErrorHandler=(message,details,type)=>{if("undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope){const webWorkerError="Web Worker has uninitialized reportError function; this means this error message cannot show up in the UI (so we show it here in the console instead).";console.error(webWorkerError,message,details,type)}else console.error("Error before error display is mounted",message,details,type)};let addError=defaultErrorHandler;function reportError(message,details,type){addError(message,details,type)}reportError.expectCalledDuringTest=(()=>{})},
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){var g;g=function(){return this}();try{g=g||new Function("return this")()}catch(e){"object"==typeof window&&(g=window)}module.exports=g},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/src/panels/ImageView/CameraModel.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";function _defineProperty(obj,key,value){return key in obj?Object.defineProperty(obj,key,{value:value,enumerable:!0,configurable:!0,writable:!0}):obj[key]=value,obj}Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;const DISTORTION_STATE={NONE:"NONE",CALIBRATED:"CALIBRATED"};exports.default=class{constructor(info){_defineProperty(this,"_distortionState",DISTORTION_STATE.NONE),_defineProperty(this,"D",[]),_defineProperty(this,"K",[]),_defineProperty(this,"P",[]),_defineProperty(this,"R",[]);const{binning_x:binning_x,binning_y:binning_y,roi:roi,distortion_model:distortion_model,D:D,K:K,P:P,R:R}=info;if(""===distortion_model)return void(this._distortionState=DISTORTION_STATE.NONE);const adjustBinning=(binning_x||1)>1||(binning_y||1)>1,adjustRoi=0!==roi.x_offset||0!==roi.y_offset;if(adjustBinning||adjustRoi)throw new Error("Failed to initialize camera model: unable to handle adjusted binning and adjusted roi camera models.");if(0!==P[3]||0!==P[7])throw new Error("Failed to initialize camera model: projection matrix implies non monocular camera - cannot handle at this time.");if("plumb_bob"!==distortion_model&&"rational_polynomial"!==distortion_model)throw new Error("Failed to initialize camera model: distortion_model is unknown, only plumb_bob and rational_polynomial are supported.");this._distortionState=0===D[0]?DISTORTION_STATE.NONE:DISTORTION_STATE.CALIBRATED,this.D=D,this.P=P,this.R=R,this.K=K}unrectifyPoint({x:rectX,y:rectY}){if(this._distortionState===DISTORTION_STATE.NONE)return{x:rectX,y:rectY};const{P:P,R:R,D:D,K:K}=this,fx=P[0],fy=P[5],cx=P[2],cy=P[6],x1=(rectX-cx-P[3])/fx,y1=(rectY-cy-P[7])/fy,X=R[0]*x1+R[1]*y1+R[2],Y=R[3]*x1+R[4]*y1+R[5],W=R[6]*x1+R[7]*y1+R[8],xp=X/W,yp=Y/W,r2=xp*xp+yp*yp,r4=r2*r2,r6=r4*r2,a1=2*xp*yp,k1=D[0],k2=D[1],p1=D[2],p2=D[3];let barrel_correction=1+k1*r2+k2*r4+D[4]*r6;8===D.length&&(barrel_correction/=1+D[5]*r2+D[6]*r4+D[7]*r6);const ypp=yp*barrel_correction+p1*(r2+yp*yp*2)+p2*a1;return{x:(xp*barrel_correction+p1*a1+p2*(r2+xp*xp*2))*K[0]+K[2],y:ypp*K[4]+K[5]}}}},
/*!*****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_baseGetTag.js ***!
  \*****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var Symbol=__webpack_require__(/*! ./_Symbol */9),getRawTag=__webpack_require__(/*! ./_getRawTag */21),objectToString=__webpack_require__(/*! ./_objectToString */22),nullTag="[object Null]",undefinedTag="[object Undefined]",symToStringTag=Symbol?Symbol.toStringTag:void 0;module.exports=function(value){return null==value?void 0===value?undefinedTag:nullTag:symToStringTag&&symToStringTag in Object(value)?getRawTag(value):objectToString(value)}},
/*!*************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_Symbol.js ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var Symbol=__webpack_require__(/*! ./_root */4).Symbol;module.exports=Symbol},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_getNative.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var baseIsNative=__webpack_require__(/*! ./_baseIsNative */29),getValue=__webpack_require__(/*! ./_getValue */34);module.exports=function(object,key){var value=getValue(object,key);return baseIsNative(value)?value:void 0}},
/*!**********************************************!*\
  !*** ./packages/webviz-core/src/util/Rpc.js ***!
  \**********************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";function _defineProperty(obj,key,value){return key in obj?Object.defineProperty(obj,key,{value:value,enumerable:!0,configurable:!0,writable:!0}):obj[key]=value,obj}Object.defineProperty(exports,"__esModule",{value:!0}),exports.createLinkedChannels=function(){const local={onmessage:void 0,postMessage(data,transfer){const ev=new MessageEvent("message",{data:data});remote.onmessage&&remote.onmessage(ev)},terminate:()=>{}},remote={onmessage:void 0,postMessage(data,transfer){const ev=new MessageEvent("message",{data:data});local.onmessage&&local.onmessage(ev)},terminate:()=>{}};return{local:local,remote:remote}},exports.default=void 0;const RESPONSE="$$RESPONSE",ERROR="$$ERROR";class Rpc{constructor(channel){if(_defineProperty(this,"_channel",void 0),_defineProperty(this,"_messageId",0),_defineProperty(this,"_pendingCallbacks",{}),_defineProperty(this,"_receivers",new Map),_defineProperty(this,"_onChannelMessage",ev=>{const{id:id,topic:topic,data:data}=ev.data;if(topic===RESPONSE)return this._pendingCallbacks[id](ev.data),void delete this._pendingCallbacks[id];new Promise((resolve,reject)=>{const handler=this._receivers.get(topic);if(!handler)throw new Error(`no receiver registered for ${topic}`);resolve(handler(data))}).then(result=>{if(!result)return this._channel.postMessage({topic:RESPONSE,id:id});const transferrables=result[Rpc.transferrables];delete result[Rpc.transferrables];const message={topic:RESPONSE,id:id,data:result};this._channel.postMessage(message,transferrables)}).catch(err=>{const message={topic:RESPONSE,id:id,data:{[ERROR]:!0,name:err.name,message:err.message,stack:err.stack}};this._channel.postMessage(message)})}),this._channel=channel,this._channel.onmessage)throw new Error("channel.onmessage is already set. Can only use one Rpc instance per channel.");this._channel.onmessage=this._onChannelMessage}send(topic,data,transfer){const id=this._messageId++,message={topic:topic,id:id,data:data},result=new Promise((resolve,reject)=>{this._pendingCallbacks[id]=(info=>{if(info.data&&info.data[ERROR]){const error=new Error(info.data.message);error.name=info.data.name,error.stack=info.data.stack,reject(error)}else resolve(info.data)})});return this._channel.postMessage(message,transfer),result}receive(topic,handler){if(this._receivers.has(topic))throw new Error(`Receiver already registered for topic: ${topic}`);this._receivers.set(topic,handler)}}exports.default=Rpc,_defineProperty(Rpc,"transferrables","$$TRANSFERRABLES")},
/*!************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib?cacheDirectory!./packages/webviz-core/src/panels/ImageView/ImageCanvas.worker.js ***!
  \************************************************************************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";(function(global){Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var obj,_renderImage=__webpack_require__(/*! ./renderImage */13),_Rpc=(obj=__webpack_require__(/*! webviz-core/src/util/Rpc */11))&&obj.__esModule?obj:{default:obj},_RpcUtils=__webpack_require__(/*! webviz-core/src/util/RpcUtils */52);function _defineProperty(obj,key,value){return key in obj?Object.defineProperty(obj,key,{value:value,enumerable:!0,configurable:!0,writable:!0}):obj[key]=value,obj}class ImageCanvasWorker{constructor(rpc){_defineProperty(this,"_idToCanvas",{}),_defineProperty(this,"_rpc",void 0),this._rpc=rpc,(0,_RpcUtils.setupSendReportErrorHandler)(this._rpc),rpc.receive("initialize",async({id:id,canvas:canvas})=>{this._idToCanvas[id]=canvas}),rpc.receive("renderImage",async({id:id,imageMessage:imageMessage,rawMarkerData:rawMarkerData,imageMarkerDatatypes:imageMarkerDatatypes,imageMarkerArrayDatatypes:imageMarkerArrayDatatypes})=>{const canvas=this._idToCanvas[id];return(0,_renderImage.renderImage)({canvas:canvas,imageMessage:imageMessage,rawMarkerData:rawMarkerData,imageMarkerDatatypes:imageMarkerDatatypes,imageMarkerArrayDatatypes:imageMarkerArrayDatatypes})})}}exports.default=ImageCanvasWorker,global.postMessage&&!global.onmessage&&new ImageCanvasWorker(new _Rpc.default(global))}).call(this,__webpack_require__(/*! ./../../../../../node_modules/webpack/buildin/global.js */6))},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/src/panels/ImageView/renderImage.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.renderImage=async function({canvas:canvas,imageMessage:imageMessage,rawMarkerData:rawMarkerData,imageMarkerDatatypes:imageMarkerDatatypes,imageMarkerArrayDatatypes:imageMarkerArrayDatatypes}){if(!canvas)return null;if(!imageMessage)return clearCanvas(canvas),null;let markerData=null;try{markerData=(0,_util.buildMarkerData)(rawMarkerData)}catch(error){(0,_reportError.default)("Failed to initialize camera model from CameraInfo",error,"user")}try{const bitmap=await async function(msg){let image;const{data:rawData,is_bigendian:is_bigendian}=msg.message;if(!(rawData instanceof Uint8Array))throw new Error("Message must have data of type Uint8Array");if("sensor_msgs/Image"===msg.datatype){const{width:width,height:height,encoding:encoding}=msg.message;switch(image=new ImageData(width,height),encoding){case"yuv422":(0,_decodings.decodeYUV)(rawData,width,height,image.data);break;case"rgb8":(0,_decodings.decodeRGB8)(rawData,width,height,image.data);break;case"bgr8":(0,_decodings.decodeBGR8)(rawData,width,height,image.data);break;case"32FC1":(0,_decodings.decodeFloat1c)(rawData,width,height,is_bigendian,image.data);break;case"bayer_rggb8":(0,_decodings.decodeBayerRGGB8)(rawData,width,height,image.data);break;case"bayer_bggr8":(0,_decodings.decodeBayerBGGR8)(rawData,width,height,image.data);break;case"bayer_gbrg8":(0,_decodings.decodeBayerGBRG8)(rawData,width,height,image.data);break;case"bayer_grbg8":(0,_decodings.decodeBayerGRBG8)(rawData,width,height,image.data);break;case"mono8":case"8UC1":(0,_decodings.decodeMono8)(rawData,width,height,image.data);break;case"mono16":case"16UC1":(0,_decodings.decodeMono16)(rawData,width,height,is_bigendian,image.data);break;default:throw new Error(`Unsupported encoding ${encoding}`)}}else{if("sensor_msgs/CompressedImage"!==msg.datatype)throw new Error(`Message datatype ${msg.datatype} not usable for rendering images.`);image=new Blob([rawData],{type:`image/${msg.message.format}`})}return self.createImageBitmap(image)}(imageMessage),dimensions=function(canvas,bitmap,markerData,imageMarkerDatatypes,imageMarkerArrayDatatypes){let bitmapDimensions={width:bitmap.width,height:bitmap.height};const ctx=canvas.getContext("2d");if(!markerData)return resizeCanvas(canvas,bitmap.width,bitmap.height),ctx.transform(1,0,0,1,0,0),ctx.drawImage(bitmap,0,0),bitmapDimensions;const{markers:markers,cameraModel:cameraModel}=markerData;let{originalWidth:originalWidth,originalHeight:originalHeight}=markerData;null==originalWidth&&(originalWidth=bitmap.width);null==originalHeight&&(originalHeight=bitmap.height);bitmapDimensions={width:originalWidth,height:originalHeight},resizeCanvas(canvas,originalWidth,originalHeight),ctx.save(),ctx.scale(originalWidth/bitmap.width,originalHeight/bitmap.height),ctx.drawImage(bitmap,0,0),ctx.restore(),ctx.save();try{!function(ctx,markers,cameraModel,imageMarkerDatatypes,imageMarkerArrayDatatypes){for(const msg of markers){if(ctx.save(),imageMarkerArrayDatatypes.includes(msg.datatype))for(const marker of msg.message.markers)paintMarker(ctx,marker,cameraModel);else imageMarkerDatatypes.includes(msg.datatype)?paintMarker(ctx,msg.message,cameraModel):console.warn("unrecognized image marker datatype",msg);ctx.restore()}}(ctx,markers,cameraModel,imageMarkerDatatypes,imageMarkerArrayDatatypes)}catch(err){console.warn("error painting markers:",err)}finally{ctx.restore()}return bitmapDimensions}(canvas,bitmap,markerData,imageMarkerDatatypes,imageMarkerArrayDatatypes);return bitmap.close(),dimensions}catch(error){throw clearCanvas(canvas),error}};_interopRequireDefault(__webpack_require__(/*! ./CameraModel */7));var _decodings=__webpack_require__(/*! ./decodings */14),_util=__webpack_require__(/*! ./util */15),_reportError=_interopRequireDefault(__webpack_require__(/*! webviz-core/src/util/reportError */5));function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function toRGBA(color){const{r:r,g:g,b:b,a:a}=color;return`rgba(${r}, ${g}, ${b}, ${a||1})`}function maybeUnrectifyPoint(cameraModel,point){return cameraModel?cameraModel.unrectifyPoint(point):point}function clearCanvas(canvas){canvas&&canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height)}function paintMarker(ctx,marker,cameraModel){switch(marker.type){case 0:{ctx.beginPath();const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.position);ctx.arc(x,y,marker.scale,0,2*Math.PI),marker.thickness<=0?(ctx.fillStyle=toRGBA(marker.outline_color),ctx.fill()):(ctx.lineWidth=marker.thickness,ctx.strokeStyle=toRGBA(marker.outline_color),ctx.stroke());break}case 2:if(marker.points.length%2!=0)break;ctx.strokeStyle=toRGBA(marker.outline_color),ctx.lineWidth=marker.thickness;for(let i=0;i<marker.points.length;i+=2){const{x:x1,y:y1}=maybeUnrectifyPoint(cameraModel,marker.points[i]),{x:x2,y:y2}=maybeUnrectifyPoint(cameraModel,marker.points[i+1]);ctx.beginPath(),ctx.moveTo(x1,y1),ctx.lineTo(x2,y2),ctx.stroke()}break;case 1:case 3:{if(0===marker.points.length)break;ctx.beginPath();const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.points[0]);ctx.moveTo(x,y);for(let i=1;i<marker.points.length;i++){const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.points[i]);ctx.lineTo(x,y)}3===marker.type&&ctx.closePath(),marker.thickness<=0?(ctx.fillStyle=toRGBA(marker.outline_color),ctx.fill()):(ctx.strokeStyle=toRGBA(marker.outline_color),ctx.lineWidth=marker.thickness,ctx.stroke());break}case 4:{if(0===marker.points.length)break;const size=marker.scale||4;if(marker.outline_colors&&marker.outline_colors.length===marker.points.length)for(let i=0;i<marker.points.length;i++){const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.points[i]);ctx.fillStyle=toRGBA(marker.outline_colors[i]),ctx.beginPath(),ctx.arc(x,y,size,0,2*Math.PI),ctx.fill()}else{ctx.beginPath();for(let i=0;i<marker.points.length;i++){const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.points[i]);ctx.arc(x,y,size,0,2*Math.PI),ctx.closePath()}ctx.fillStyle=toRGBA(marker.fill_color),ctx.fill()}break}case 5:{const{x:x,y:y}=maybeUnrectifyPoint(cameraModel,marker.position),fontSize=12*marker.scale,padding=4*marker.scale;if(ctx.font=`${fontSize}px sans-serif`,ctx.textBaseline="bottom",marker.filled){const metrics=ctx.measureText(marker.text.data),height=1.2*fontSize;ctx.fillStyle=toRGBA(marker.fill_color),ctx.fillRect(x,y-height,Math.ceil(metrics.width+2*padding),Math.ceil(height))}ctx.fillStyle=toRGBA(marker.outline_color),ctx.fillText(marker.text.data,x+padding,y);break}default:console.warn("unrecognized image marker type",marker)}}function resizeCanvas(canvas,width,height){!canvas||canvas.width===width&&canvas.height===height||(canvas.width=width,canvas.height=height)}},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/src/panels/ImageView/decodings.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";function makeSpecializedDecodeBayer(tl,tr,bl,br){return new Function("data","width","height","output",`\n  for (let i = 0; i < height / 2; i++) {\n    let inIdx = i * 2 * width;\n    let outTopIdx = i * 2 * width * 4; // Addresses top row\n    let outBottomIdx = (i * 2 + 1) * width * 4; // Addresses bottom row\n    for (let j = 0; j < width / 2; j++) {\n      const tl = data[inIdx++];\n      const tr = data[inIdx++];\n      const bl = data[inIdx + width - 2];\n      const br = data[inIdx + width - 1];\n\n      const ${tl} = tl;\n      const ${tr} = tr;\n      const ${bl} = bl;\n      const ${br} = br;\n\n      // Top row\n      output[outTopIdx++] = r;\n      output[outTopIdx++] = g0;\n      output[outTopIdx++] = b;\n      output[outTopIdx++] = 255;\n\n      output[outTopIdx++] = r;\n      output[outTopIdx++] = g0;\n      output[outTopIdx++] = b;\n      output[outTopIdx++] = 255;\n\n      // Bottom row\n      output[outBottomIdx++] = r;\n      output[outBottomIdx++] = g1;\n      output[outBottomIdx++] = b;\n      output[outBottomIdx++] = 255;\n\n      output[outBottomIdx++] = r;\n      output[outBottomIdx++] = g1;\n      output[outBottomIdx++] = b;\n      output[outBottomIdx++] = 255;\n    }\n  }`)}Object.defineProperty(exports,"__esModule",{value:!0}),exports.decodeYUV=function(yuv,width,height,output){let c=0,off=0;const max=height*width;for(let r=0;r<=max;r+=2){const u=yuv[off]-128,y1=yuv[off+1],v=yuv[off+2]-128,y2=yuv[off+3];output[c]=y1+1.402*v,output[c+1]=y1-.34414*u-.71414*v,output[c+2]=y1+1.772*u,output[c+3]=255,output[c+4]=y2+1.402*v,output[c+5]=y2-.34414*u-.71414*v,output[c+6]=y2+1.772*u,output[c+7]=255,c+=8,off+=4}},exports.decodeRGB8=function(rgb,width,height,output){let inIdx=0,outIdx=0;for(let i=0;i<width*height;i++){const r=rgb[inIdx++],g=rgb[inIdx++],b=rgb[inIdx++];output[outIdx++]=r,output[outIdx++]=g,output[outIdx++]=b,output[outIdx++]=255}},exports.decodeBGR8=function(bgr,width,height,output){let inIdx=0,outIdx=0;for(let i=0;i<width*height;i++){const b=bgr[inIdx++],g=bgr[inIdx++],r=bgr[inIdx++];output[outIdx++]=r,output[outIdx++]=g,output[outIdx++]=b,output[outIdx++]=255}},exports.decodeFloat1c=function(gray,width,height,is_bigendian,output){const view=new DataView(gray.buffer,gray.byteOffset);let outIdx=0;for(let i=0;i<width*height*4;i+=4){const val=255*view.getFloat32(i,!is_bigendian);output[outIdx++]=val,output[outIdx++]=val,output[outIdx++]=val,output[outIdx++]=255}},exports.decodeMono8=function(mono8,width,height,output){let inIdx=0,outIdx=0;for(let i=0;i<width*height;i++){const ch=mono8[inIdx++];output[outIdx++]=ch,output[outIdx++]=ch,output[outIdx++]=ch,output[outIdx++]=255}},exports.decodeMono16=function(mono16,width,height,is_bigendian,output){const view=new DataView(mono16.buffer,mono16.byteOffset);let outIdx=0;for(let i=0;i<width*height*2;i+=2){let val=view.getUint16(i,!is_bigendian);val=val/1e4*255,output[outIdx++]=val,output[outIdx++]=val,output[outIdx++]=val,output[outIdx++]=255}},exports.decodeBayerGRBG8=exports.decodeBayerGBRG8=exports.decodeBayerBGGR8=exports.decodeBayerRGGB8=void 0;const decodeBayerRGGB8=makeSpecializedDecodeBayer("r","g0","g1","b");exports.decodeBayerRGGB8=decodeBayerRGGB8;const decodeBayerBGGR8=makeSpecializedDecodeBayer("b","g0","g1","r");exports.decodeBayerBGGR8=decodeBayerBGGR8;const decodeBayerGBRG8=makeSpecializedDecodeBayer("g0","b","r","g1");exports.decodeBayerGBRG8=decodeBayerGBRG8;const decodeBayerGRBG8=makeSpecializedDecodeBayer("g0","r","b","g1");exports.decodeBayerGRBG8=decodeBayerGRBG8},
/*!***********************************************************!*\
  !*** ./packages/webviz-core/src/panels/ImageView/util.js ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.getMarkerOptions=function(imageTopic,markerTopics,allCameraNamespaces){const results=[],cameraNamespace=getCameraNamespace(imageTopic);for(const topic of markerTopics)if(cameraNamespace&&topic.startsWith(cameraNamespace))results.push({topic:topic,name:topic.substr(cameraNamespace.length).replace(/^\//,"")});else if(cameraNamespace&&topic.startsWith(`/old${cameraNamespace}`))results.push({topic:topic,name:topic});else{if(allCameraNamespaces.includes(getCameraNamespace(topic)))continue;results.push({topic:topic,name:topic})}return results},exports.getMarkerTopics=function(imageTopic,markerNames){const cameraNamespace=getCameraNamespace(imageTopic);if(cameraNamespace)return markerNames.map(name=>name.startsWith("/")?name:`${cameraNamespace}/${name}`);return[]},exports.getCameraInfoTopic=function(imageTopic){const cameraNamespace=getCameraNamespace(imageTopic);if(cameraNamespace)return`${cameraNamespace}/camera_info`;return null},exports.getCameraNamespace=getCameraNamespace,exports.groupTopics=function(topics){const imageTopicsByNamespace=new Map;for(const topic of topics){const key=getCameraNamespace(topic.name)||topic.name,vals=imageTopicsByNamespace.get(key);vals?vals.push(topic):imageTopicsByNamespace.set(key,[topic])}return imageTopicsByNamespace},exports.checkOutOfBounds=function(x,y,outsideWidth,outsideHeight,insideWidth,insideHeight){const rightX=outsideWidth-insideWidth,bottomY=outsideHeight-insideHeight;return[(0,_clamp.default)(x,Math.min(0,rightX),Math.max(0,rightX)),(0,_clamp.default)(y,Math.min(0,bottomY),Math.max(0,bottomY))]},exports.buildMarkerData=function(rawMarkerData){const{markers:markers,scale:scale,transformMarkers:transformMarkers,cameraInfo:cameraInfo}=rawMarkerData;if(0===markers.length)return{markers:markers,cameraModel:null,originalHeight:void 0,originalWidth:void 0};let cameraModel,originalWidth,originalHeight;if(transformMarkers){if(!cameraInfo)return null;cameraModel=new _CameraModel.default(cameraInfo)}if(cameraInfo&&cameraInfo.width&&cameraInfo.height)originalWidth=cameraInfo.width,originalHeight=cameraInfo.height;else{if(1!==scale)return null;originalWidth=void 0,originalHeight=void 0}return{markers:markers,cameraModel:cameraModel,originalWidth:originalWidth,originalHeight:originalHeight}},exports.supportsOffscreenCanvas=void 0;var _clamp=_interopRequireDefault(__webpack_require__(/*! lodash/clamp */16)),_memoize=_interopRequireDefault(__webpack_require__(/*! lodash/memoize */24)),_CameraModel=_interopRequireDefault(__webpack_require__(/*! ./CameraModel */7)),_reportError=_interopRequireDefault(__webpack_require__(/*! webviz-core/src/util/reportError */5));function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function getCameraNamespace(topicName){const match=topicName.match(/^(\/old)?(?!\/old)(\/[^\/]+)\//);return match?match[2]:null}const supportsOffscreenCanvas=(0,_memoize.default)(()=>{try{document.createElement("canvas").transferControlToOffscreen()}catch(error){return(0,_reportError.default)("Rendering the image view in a worker is unsupported in this browser, falling back to rendering using the main thread","","app"),!1}return!0});exports.supportsOffscreenCanvas=supportsOffscreenCanvas},
/*!***********************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/clamp.js ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var baseClamp=__webpack_require__(/*! ./_baseClamp */17),toNumber=__webpack_require__(/*! ./toNumber */18);module.exports=function(number,lower,upper){return void 0===upper&&(upper=lower,lower=void 0),void 0!==upper&&(upper=(upper=toNumber(upper))==upper?upper:0),void 0!==lower&&(lower=(lower=toNumber(lower))==lower?lower:0),baseClamp(toNumber(number),lower,upper)}},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_baseClamp.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(number,lower,upper){return number==number&&(void 0!==upper&&(number=number<=upper?number:upper),void 0!==lower&&(number=number>=lower?number:lower)),number}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/toNumber.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var isObject=__webpack_require__(/*! ./isObject */3),isSymbol=__webpack_require__(/*! ./isSymbol */19),NAN=NaN,reTrim=/^\s+|\s+$/g,reIsBadHex=/^[-+]0x[0-9a-f]+$/i,reIsBinary=/^0b[01]+$/i,reIsOctal=/^0o[0-7]+$/i,freeParseInt=parseInt;module.exports=function(value){if("number"==typeof value)return value;if(isSymbol(value))return NAN;if(isObject(value)){var other="function"==typeof value.valueOf?value.valueOf():value;value=isObject(other)?other+"":other}if("string"!=typeof value)return 0===value?value:+value;value=value.replace(reTrim,"");var isBinary=reIsBinary.test(value);return isBinary||reIsOctal.test(value)?freeParseInt(value.slice(2),isBinary?2:8):reIsBadHex.test(value)?NAN:+value}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/isSymbol.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var baseGetTag=__webpack_require__(/*! ./_baseGetTag */8),isObjectLike=__webpack_require__(/*! ./isObjectLike */23),symbolTag="[object Symbol]";module.exports=function(value){return"symbol"==typeof value||isObjectLike(value)&&baseGetTag(value)==symbolTag}},
/*!*****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_freeGlobal.js ***!
  \*****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){(function(global){var freeGlobal="object"==typeof global&&global&&global.Object===Object&&global;module.exports=freeGlobal}).call(this,__webpack_require__(/*! ./../../../../node_modules/webpack/buildin/global.js */6))},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_getRawTag.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var Symbol=__webpack_require__(/*! ./_Symbol */9),objectProto=Object.prototype,hasOwnProperty=objectProto.hasOwnProperty,nativeObjectToString=objectProto.toString,symToStringTag=Symbol?Symbol.toStringTag:void 0;module.exports=function(value){var isOwn=hasOwnProperty.call(value,symToStringTag),tag=value[symToStringTag];try{value[symToStringTag]=void 0;var unmasked=!0}catch(e){}var result=nativeObjectToString.call(value);return unmasked&&(isOwn?value[symToStringTag]=tag:delete value[symToStringTag]),result}},
/*!*********************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_objectToString.js ***!
  \*********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){var nativeObjectToString=Object.prototype.toString;module.exports=function(value){return nativeObjectToString.call(value)}},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/isObjectLike.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(value){return null!=value&&"object"==typeof value}},
/*!*************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/memoize.js ***!
  \*************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var MapCache=__webpack_require__(/*! ./_MapCache */25),FUNC_ERROR_TEXT="Expected a function";function memoize(func,resolver){if("function"!=typeof func||null!=resolver&&"function"!=typeof resolver)throw new TypeError(FUNC_ERROR_TEXT);var memoized=function(){var args=arguments,key=resolver?resolver.apply(this,args):args[0],cache=memoized.cache;if(cache.has(key))return cache.get(key);var result=func.apply(this,args);return memoized.cache=cache.set(key,result)||cache,result};return memoized.cache=new(memoize.Cache||MapCache),memoized}memoize.Cache=MapCache,module.exports=memoize},
/*!***************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_MapCache.js ***!
  \***************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var mapCacheClear=__webpack_require__(/*! ./_mapCacheClear */26),mapCacheDelete=__webpack_require__(/*! ./_mapCacheDelete */47),mapCacheGet=__webpack_require__(/*! ./_mapCacheGet */49),mapCacheHas=__webpack_require__(/*! ./_mapCacheHas */50),mapCacheSet=__webpack_require__(/*! ./_mapCacheSet */51);function MapCache(entries){var index=-1,length=null==entries?0:entries.length;for(this.clear();++index<length;){var entry=entries[index];this.set(entry[0],entry[1])}}MapCache.prototype.clear=mapCacheClear,MapCache.prototype.delete=mapCacheDelete,MapCache.prototype.get=mapCacheGet,MapCache.prototype.has=mapCacheHas,MapCache.prototype.set=mapCacheSet,module.exports=MapCache},
/*!********************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_mapCacheClear.js ***!
  \********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var Hash=__webpack_require__(/*! ./_Hash */27),ListCache=__webpack_require__(/*! ./_ListCache */39),Map=__webpack_require__(/*! ./_Map */46);module.exports=function(){this.size=0,this.__data__={hash:new Hash,map:new(Map||ListCache),string:new Hash}}},
/*!***********************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_Hash.js ***!
  \***********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var hashClear=__webpack_require__(/*! ./_hashClear */28),hashDelete=__webpack_require__(/*! ./_hashDelete */35),hashGet=__webpack_require__(/*! ./_hashGet */36),hashHas=__webpack_require__(/*! ./_hashHas */37),hashSet=__webpack_require__(/*! ./_hashSet */38);function Hash(entries){var index=-1,length=null==entries?0:entries.length;for(this.clear();++index<length;){var entry=entries[index];this.set(entry[0],entry[1])}}Hash.prototype.clear=hashClear,Hash.prototype.delete=hashDelete,Hash.prototype.get=hashGet,Hash.prototype.has=hashHas,Hash.prototype.set=hashSet,module.exports=Hash},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_hashClear.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var nativeCreate=__webpack_require__(/*! ./_nativeCreate */0);module.exports=function(){this.__data__=nativeCreate?nativeCreate(null):{},this.size=0}},
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_baseIsNative.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var isFunction=__webpack_require__(/*! ./isFunction */30),isMasked=__webpack_require__(/*! ./_isMasked */31),isObject=__webpack_require__(/*! ./isObject */3),toSource=__webpack_require__(/*! ./_toSource */33),reIsHostCtor=/^\[object .+?Constructor\]$/,funcProto=Function.prototype,objectProto=Object.prototype,funcToString=funcProto.toString,hasOwnProperty=objectProto.hasOwnProperty,reIsNative=RegExp("^"+funcToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");module.exports=function(value){return!(!isObject(value)||isMasked(value))&&(isFunction(value)?reIsNative:reIsHostCtor).test(toSource(value))}},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/isFunction.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var baseGetTag=__webpack_require__(/*! ./_baseGetTag */8),isObject=__webpack_require__(/*! ./isObject */3),asyncTag="[object AsyncFunction]",funcTag="[object Function]",genTag="[object GeneratorFunction]",proxyTag="[object Proxy]";module.exports=function(value){if(!isObject(value))return!1;var tag=baseGetTag(value);return tag==funcTag||tag==genTag||tag==asyncTag||tag==proxyTag}},
/*!***************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_isMasked.js ***!
  \***************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var uid,coreJsData=__webpack_require__(/*! ./_coreJsData */32),maskSrcKey=(uid=/[^.]+$/.exec(coreJsData&&coreJsData.keys&&coreJsData.keys.IE_PROTO||""))?"Symbol(src)_1."+uid:"";module.exports=function(func){return!!maskSrcKey&&maskSrcKey in func}},
/*!*****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_coreJsData.js ***!
  \*****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var coreJsData=__webpack_require__(/*! ./_root */4)["__core-js_shared__"];module.exports=coreJsData},
/*!***************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_toSource.js ***!
  \***************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){var funcToString=Function.prototype.toString;module.exports=function(func){if(null!=func){try{return funcToString.call(func)}catch(e){}try{return func+""}catch(e){}}return""}},
/*!***************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_getValue.js ***!
  \***************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(object,key){return null==object?void 0:object[key]}},
/*!*****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_hashDelete.js ***!
  \*****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(key){var result=this.has(key)&&delete this.__data__[key];return this.size-=result?1:0,result}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_hashGet.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var nativeCreate=__webpack_require__(/*! ./_nativeCreate */0),HASH_UNDEFINED="__lodash_hash_undefined__",hasOwnProperty=Object.prototype.hasOwnProperty;module.exports=function(key){var data=this.__data__;if(nativeCreate){var result=data[key];return result===HASH_UNDEFINED?void 0:result}return hasOwnProperty.call(data,key)?data[key]:void 0}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_hashHas.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var nativeCreate=__webpack_require__(/*! ./_nativeCreate */0),hasOwnProperty=Object.prototype.hasOwnProperty;module.exports=function(key){var data=this.__data__;return nativeCreate?void 0!==data[key]:hasOwnProperty.call(data,key)}},
/*!**************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_hashSet.js ***!
  \**************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var nativeCreate=__webpack_require__(/*! ./_nativeCreate */0),HASH_UNDEFINED="__lodash_hash_undefined__";module.exports=function(key,value){var data=this.__data__;return this.size+=this.has(key)?0:1,data[key]=nativeCreate&&void 0===value?HASH_UNDEFINED:value,this}},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_ListCache.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var listCacheClear=__webpack_require__(/*! ./_listCacheClear */40),listCacheDelete=__webpack_require__(/*! ./_listCacheDelete */41),listCacheGet=__webpack_require__(/*! ./_listCacheGet */43),listCacheHas=__webpack_require__(/*! ./_listCacheHas */44),listCacheSet=__webpack_require__(/*! ./_listCacheSet */45);function ListCache(entries){var index=-1,length=null==entries?0:entries.length;for(this.clear();++index<length;){var entry=entries[index];this.set(entry[0],entry[1])}}ListCache.prototype.clear=listCacheClear,ListCache.prototype.delete=listCacheDelete,ListCache.prototype.get=listCacheGet,ListCache.prototype.has=listCacheHas,ListCache.prototype.set=listCacheSet,module.exports=ListCache},
/*!*********************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_listCacheClear.js ***!
  \*********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(){this.__data__=[],this.size=0}},
/*!**********************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_listCacheDelete.js ***!
  \**********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var assocIndexOf=__webpack_require__(/*! ./_assocIndexOf */1),splice=Array.prototype.splice;module.exports=function(key){var data=this.__data__,index=assocIndexOf(data,key);return!(index<0||(index==data.length-1?data.pop():splice.call(data,index,1),--this.size,0))}},
/*!********************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/eq.js ***!
  \********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(value,other){return value===other||value!=value&&other!=other}},
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_listCacheGet.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var assocIndexOf=__webpack_require__(/*! ./_assocIndexOf */1);module.exports=function(key){var data=this.__data__,index=assocIndexOf(data,key);return index<0?void 0:data[index][1]}},
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_listCacheHas.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var assocIndexOf=__webpack_require__(/*! ./_assocIndexOf */1);module.exports=function(key){return assocIndexOf(this.__data__,key)>-1}},
/*!*******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_listCacheSet.js ***!
  \*******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var assocIndexOf=__webpack_require__(/*! ./_assocIndexOf */1);module.exports=function(key,value){var data=this.__data__,index=assocIndexOf(data,key);return index<0?(++this.size,data.push([key,value])):data[index][1]=value,this}},
/*!**********************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_Map.js ***!
  \**********************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var Map=__webpack_require__(/*! ./_getNative */10)(__webpack_require__(/*! ./_root */4),"Map");module.exports=Map},
/*!*********************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_mapCacheDelete.js ***!
  \*********************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var getMapData=__webpack_require__(/*! ./_getMapData */2);module.exports=function(key){var result=getMapData(this,key).delete(key);return this.size-=result?1:0,result}},
/*!****************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_isKeyable.js ***!
  \****************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports){module.exports=function(value){var type=typeof value;return"string"==type||"number"==type||"symbol"==type||"boolean"==type?"__proto__"!==value:null===value}},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_mapCacheGet.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var getMapData=__webpack_require__(/*! ./_getMapData */2);module.exports=function(key){return getMapData(this,key).get(key)}},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_mapCacheHas.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var getMapData=__webpack_require__(/*! ./_getMapData */2);module.exports=function(key){return getMapData(this,key).has(key)}},
/*!******************************************************************!*\
  !*** ./packages/webviz-core/node_modules/lodash/_mapCacheSet.js ***!
  \******************************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){var getMapData=__webpack_require__(/*! ./_getMapData */2);module.exports=function(key,value){var data=getMapData(this,key),size=data.size;return data.set(key,value),this.size+=data.size==size?0:1,this}},
/*!***************************************************!*\
  !*** ./packages/webviz-core/src/util/RpcUtils.js ***!
  \***************************************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.setupSendReportErrorHandler=function(rpc){(0,_reportError.setErrorHandler)((message,details,type)=>{rpc.send("reportError",{message:message,details:details instanceof Error?details.toString():JSON.stringify(details),type:type})})},exports.setupReceiveReportErrorHandler=function(rpc){rpc.receive("reportError",({message:message,details:details,type:type})=>{(0,_reportError.default)(message,details,type)})};(obj=__webpack_require__(/*! ./Rpc */11))&&obj.__esModule;var obj,_reportError=function(obj){if(obj&&obj.__esModule)return obj;var newObj={};if(null!=obj)for(var key in obj)if(Object.prototype.hasOwnProperty.call(obj,key)){var desc=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(obj,key):{};desc.get||desc.set?Object.defineProperty(newObj,key,desc):newObj[key]=obj[key]}return newObj.default=obj,newObj}(__webpack_require__(/*! webviz-core/src/util/reportError */5))}]);