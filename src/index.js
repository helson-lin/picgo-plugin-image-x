const { imagex } = require('@volcengine/openapi')
const imagexService = new imagex.ImagexService()

const config = (ctx) => {
  let userConfig = ctx.getConfig('picBed.imageX-uploader')
  if (!userConfig) {
    userConfig = {}
  }
  const config = [
    {
      name: 'accessKey',
      type: 'input',
      default: userConfig.accessKey || '',
      message: 'AccessKey不能为空',
      required: true
    },
    {
      name: 'secretKey',
      type: 'input',
      default: userConfig.secretKey || '',
      message: 'SecretKey不能为空',
      required: true
    },
    {
      name: 'serviceId',
      type: 'input',
      alias: 'serviceId',
      default: userConfig.serviceId || '',
      message: '服务Id',
      required: true
    },
    {
      name: 'region',
      type: 'input',
      alias: '地区',
      default: userConfig.region || 'cn-north-1',
      message: '例如：cn-north-1 (默认)',
      required: true
    },
    {
      name: 'host',
      type: 'input',
      alias: '地区host',
      default: userConfig.host || 'imagex.volcengineapi.com',
      message: '例如：imagex.volcengineapi.com (默认)',
      required: true
    },
    {
      name: 'imgTemp',
      type: 'input',
      alias: '图片模板',
      default: userConfig.imgTemp || '',
      message: '例如：tplv-jafkehkiym-1/png, 可以不配置',
      required: false
    },
    {
      name: 'imgTempIc',
      type: 'input',
      alias: '图片模板格式',
      default: userConfig.imgTempIc || '',
      message: '例如：png, 可以不配置',
      required: false
    },
    {
      name: 'customUrl',
      type: 'input',
      alias: '自定义域名',
      default: userConfig.customUrl || '',
      message: '例如：http://bucket.xxx.com',
      required: false
    }
  ]
  return config
}

/**
 * @description: 设置aksk
 * @param {string} AccessKeyId
 * @param {string} SecretKey
 * @return {*}
 */
const setAkSk = (ctx, AccessKeyId, SecretKey, region, host) => {
  // 设置aksk
  imagexService.setAccessKeyId(AccessKeyId)
  imagexService.setSecretKey(SecretKey)
  // 设置地域
  imagexService.setRegion(region)
  imagexService.setHost(host)
}

const uploadImage = async (ctx, serviceId, img) => {
  const options = {
    serviceId: serviceId,
    files: [img]
  }
  ctx.log.info('上传')
  const res = await imagexService.UploadImages(options)
  ctx.log.info(res)
  return res
}

const handle = async (ctx) => {
  const userConfig = ctx.getConfig('picBed.imageX-uploader')
  if (!userConfig) {
    throw new Error('未配置参数，请配置imageX上传参数')
  }
  const accessKey = userConfig.accessKey
  const secretKey = userConfig.secretKey
  const serviceId = userConfig.serviceId
  const region = userConfig.region
  const host = userConfig.host
  const imgTemp = userConfig.imgTemp
  const imgTempIc = userConfig.imgTempIc
  ctx.log.warn('开始上传')
  // 设置配置信息
  setAkSk(ctx, accessKey, secretKey, region, host)
  const customUrl = userConfig.customUrl
  try {
    // 上次图片
    const imgList = ctx.output
    for (let i in imgList) {
      let img = imgList[i].buffer
      if (!img && imgList[i].base64Image) {
        img = Buffer.from(imgList[i].base64Image, 'base64')
      }
      const res = await uploadImage(ctx, serviceId, img)
      if (res.Result && res.Result.Results) {
        let url = res.Result.PluginResult[0].ImageUri
        if (imgTemp) {
          url += `~${imgTemp}.${imgTempIc}`
        }
        ctx.log.info(url)
        delete imgList[i].base64Image
        delete imgList[i].buffer
        imgList[i]['imgUrl'] = `${customUrl}/${url}`
      } else {
        throw new Error('Upload failed')
      }
    }
    return ctx
  } catch (err) {
    if (err.error === 'Upload failed') {
      ctx.emit('notification', {
        title: '上传失败！',
        body: '请检查你的配置项是否正确'
      })
    } else {
      ctx.emit('notification', {
        title: '上传失败！',
        body: '请检查你的配置项是否正确'
      })
    }
    throw err
  }
}

module.exports = (ctx) => {
  const register = () => {
    ctx.log.success('imageX加载成功')
    ctx.helper.uploader.register('imageX-uploader', {
      handle: handle,
      config: config,
      name: 'imageX'
    })
  }
  return {
    register,
    uploader: 'imageX-uploader'
  }
}
