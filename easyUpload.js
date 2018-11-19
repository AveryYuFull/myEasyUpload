(function ($) {
  $.fn.easyUpload = function (opts) {
    const defaultOpts = {
      // 限制条件
      allowFileTypes: '*.jpg;*.pdf;*.docs', // 限制的文件类型
      allowFileSize: 100000, // 限制的文件最大大小（单位KB)
  
      // 多选配置
      multi: true, // 是否支持多选(默认为true)
      multiNum: 5, // 限制最多选择文件数（默认为5个）
      
      // 文案配置
      selectText: '选择文件', // 选择文件按钮的文案
      showNote: true, // 是否显示说明文案
      note: '提示：最多上传5个文件，超出默认前五个，支持格式为：doc、docx、pdf', //文件上传说明
      
      // 是否显示预览图片
      showPreview: true,
  
      // 接口请求配置
      url: '', // 上传地址
      fileName: 'file', // 文件上传的key
      formParam: null, // 文件以外的配置参数
      okCode: 200, // 接口返回上传成功的code标识
      timeout: 30000, // 上传的超时时间
  
      // 接口回调方法
      successFunc: null, // 上传成功的回调
      errorFunc: null, // 上传失败的回调
      deleteFunc: null // 删除文件的回调
    }

    let opts = $.extend(defaultOpts, opts);
  
    /**
     * 工具方法
     */
    const F = {
      /**
       * 格式化类型字符串
       * example：
       *   "*.jpg;*.png" ==> ["jpg", "png"]
       * @param {String} types 需要格式化的文件类型字符串
       * @returns {Array<String>} 返回格式化后的类型数组
       */
      formatFileTypes (types) {
        let res = [];
        const _types = (types || '') + '';
        if (_types) {
          let _typeArr = _types.split(';') || [];
          _typeArr.forEach(item => {
            if (item) {
              let _type = item.split('.').pop();
              _type && res.push(_type);
            }
          });
        }
        return res;
      },
      /**
       * 格式化文件大小
       * @param {Number} size 文件大小 
       * @param {Boolean} isKb 是否转化为kb
       * @returns {String} 格式化后的字符串
       */
      formatFileSize (size, isKb) {
        let res = '';
        const _size = (size || '') + '';
  
        if (_size) {
          if (_size >= 1024 * 1024 && !isKb) {
            _size = Math.round((_size * 100) / 1024 / 1024) / 100 + 'MB';
          } else {
            _size = Math.round((_size * 100) / 1024) / 100 + 'KB';
          }
        }
        return _size;
      }
    }
  
    this.each(function (index, element) {
      let _ele = $(element);
      // 选中的文件列表
      let selectedFiles = [];

      let easyManager = {
        init () {
          let $html = '';
          $html += '<div class="easy_upload-container"><div class="easy_upload-head">';
          $html += '<input type="file" ';
          $html += opts.multi ? 'multiple' : '';
          $html += 'class="fileInput" data-count="0" style="display:none;" />';
          $html += '<div class="easy_upload-select noSelect">' + opts.selectText + '</div>';
          $html += opts.multi ? '<div class="easy_upload-head-uploadBtn noSelect">上传</div>' : '';
          $html += opts.multi ? '<div class="easy_upload-head-deleteBtn noSelect">删除</div>' : '';
          $html += opts.multi ? '<div class="easyUploadIcon noSelect easy_upload-head-check" data-check="no">&#xe693;</div>' : '';
          $html += opts.showNote ? '<div class="easy_upload-note">' + opts.note + '</div>' : '';
          $html += '</div>';
          $html += '</div>';
          _ele.html($html);
          this.bindHead();
        },
        bindHead () {
          $('.easy_upload-select').off('click').click(() => {
            $(this).parent().find('.fileInput').trigger('click');
          });
          $('.fileInput').off('change').change((evt) => {
            let _fileArray = [];
            let count = Number($(this).attr('data-count'));
            const _files = this.files;
            if (_files) {
              for (let i = 0; i < _files.lenght; i++) {
                let obj = {
                  index: count,
                  file: _files[i]
                };
                _fileArray.push(obj);
                selectedFiles.push(obj);
                ++count;
              }
              $(this).attr('data-count', count);
              $(this).parent().find('easy_upload-head-check').html('&#xe693').attr('data-check', 'no');
            }
            _fileArray = this.checkFile(_fileArray);
          });
        },
        checkFile (fileArray) {
          const _typesArr = F.formatFileTypes(opts.allowFileTypes);
          const _allowFileSize = F.formatFileSize(opts.allowFileSize, true);

          if (fileArray && Array.isArray(fileArray) && 
            fileArray.lenght > 0) {
              for (let i = 0; i < fileArray.length; i++) {
                const _file = fileArray[i].file;
                const _type = _file.split('.').pop();
                const _size = _file.size || '0';
                if ($.inArray('*', _typesArr) || $.inArray(_type, _typesArr) > -1) {
                  if (parseInt(F.formatFileSize(_size, true)) <= _allowFileSize) {
                    fileArray[i].allow = true;
                  } else {
                    fileArray[i].allow = false;
                  }
                } else {
                  fileArray[i].allow = false;
                }
              }
          }
          return fileArray;
        },
        renderFile(fileArray) {
          if (fileArray && Array.isArray(fileArray) &&
            fileArray.length > 0) {
            function generateHtml (file) {
              if (!file) {
                return;
              }

              let $html = '';
              let preview = '';
              let sHtml = '';

              const _type = file.type.split('.').pop();
              if (_type === 'bmp' || _type === 'jpg' || _type === 'jpeg' || _type === 'png' || _type === 'gif') {
                let _url = new URL.createObjectURL(file);
                preview = '<img class="easy_upload_img" src="' + _url + '" />';
              } else if (_type === 'zip' || _type === 'rar' || _type === 'arj' || _type === 'z') {
                preview = '<i class="easyUploadIcon easy_upload_icon">&#xe69d</i>';
              } else {
                preview = '<i class="easyUploadIcon easy_upload_icon">&#xe64d</i>';
              }

              sHtml += '<div class="status status1">可以上传</div>';
              sHtml += '<div class="status status2">等待上传</div>';
              sHtml += '<div class="status status3">上传中</div>';
              sHtml += '<div class="status status4">上传失败</div>';
              sHtml += '<div class="status status5">上传成功</div>';

              $html += '<li class="easy_upload_queue_item" data-index="' + file.index + '">';
              $html +=
            }
          }
        }
      }      
    });
  }
})(jQuery);