(function ($) {
  $.fn.easyUpload = function (options) {
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

    let opts = $.extend(defaultOpts, options);
  
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
            res = Math.round((_size * 100) / 1024 / 1024) / 100 + 'MB';
          } else {
            res = Math.round((_size * 100) / 1024) / 100 + 'KB';
          }
        }
        return res;
      }
    }
  
    this.each(function (index, element) {
      let _ele = $(element);
      // 选中的文件列表
      let selectedFiles = [];
      let allowFiles = [];
      let postNums = 0;

      // 是否允许上传新的文件
      let allowNewPost = true;

      let upFinished = true;

      let easyManager = {
        init () {
          let $html = '';
          $html += '<div class="easy_upload-container"><div class="easy_upload-head">';
          $html += '<input type="file" ';
          $html += opts.multi ? 'multiple ' : ' ';
          $html += 'class="fileInput" data-count="0" style="display:none;" />';
          $html += '<div class="easy_upload-select noSelect">' + opts.selectText + '</div>';
          $html += opts.multi ? '<div class="easy_upload-head-uploadBtn noSelect">上传</div>' : ' ';
          $html += opts.multi ? '<div class="easy_upload-head-deleteBtn noSelect">删除</div>' : ' ';
          $html += opts.multi ? '<div class="easyUploadIcon easy_upload-head-check" data-check="no">&#xe693;</div>' : ' ';
          $html += opts.showNote ? '<div class="easy_upload-note">' + opts.note + '</div>' : ' ';
          $html += '</div>';
          $html += '<ul class="easy_upload-queue"></ul>';
          $html += '</div>';
          _ele.html($html);
          this.bindHead();
        },
        bindHead () {
          const _that = this;
          $('.easy_upload-select').off('click').click(function () {
            $(this).parent().find('.fileInput').trigger('click');
          });
          $('.fileInput').off('change').change(function (evt) {
            let _fileArray = [];
            let count = Number($(this).attr('data-count')) || 0;
            const _files = this.files;
            if (_files) {
              for (let i = 0; i < _files.length; i++) {
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
            _fileArray = _that.checkFile(_fileArray);
            _that.renderFile(_fileArray, this);
          });
          $('.easy_upload-head-check').off('click').click(function () {
            const opts = {type: 'all', target: this};
            let _checked = $(this).attr('data-check');
            if (_checked === 'yes') {
              opts.checked = 'no';
            } else {
              opts.checked = 'yes';
            }
            _that.handleCheck(opts);
          });
          $('.easy_upload-head-uploadBtn').off('click').click(function() {
            let queueUl = $(this).parent().parent().find('.easy_upload-queue');
            if (queueUl) {
              let _arr = _that.findItems(1, queueUl);
              if (_arr && _arr.length > 0) {
                allowFiles = allowFiles.concat(_arr);
                upFinished = true;
                _that.uploadFile(queueUl);
              }
            }
          });
        },
        uploadFile(target) {
          const _that = this;
          if (!target) {
            return;
          }
          
          _that.setStatus2(target);

          function controlUp () {
            if (postNums > allowFiles.length) {
              upFinished = true;
            }
          }

          function upload () {
            if (allowNewPost) {
              allowNewPost  = false;

            }
          }
        },
        setStatus2(target) {
          const _that = this;
          if (!target) {
            return;
          }

          const _allowFiles = allowFiles || [];
          _allowFiles.forEach(item => {
            let _qItem = _that.findEle(target, item);
            let _ele = _qItem && _qItem['ele'];
            if (_qItem && _ele) {
              const _statusDiv = _qItem['statusDiv'];
              _statusDiv && $(_statusDiv).find('.status').hide().end().find('.status2').show();
              $(_ele).find('.easy_upload_queue_check').attr('data-up', '2');
              $(_ele).find('.easy_upload_btnBox .easy_upload-btn').hide();
            }
          });
          
        },
        findEle (target, index) {
          let res = null;
          if (target) {
            const _index = index || 0;
            let _qItem = $(target).find('.easy_upload_queue_item[data-index=' + _index + ']');
            if (_qItem) {
              res = {
                ele: _qItem,
                upBar: $(_qItem).find('.easy_upload_bar'),
                upPercent: $(_qItem).find('.easy_upload_percent'),
                statusDiv: $(_qItem).find('.easy_upload_status'),
                upStatus: $(_qItem).find('.easy_upload_queue_check').attr('data-up')
              };
            }
          }
          return res;
        },
        findItems (type, target) {
          let res = [];
          let _qItem = null;
          if (target) {
            if (type === 1) {
              _qItem = $(target).find('.queue_check_true[data-check="yes"][data-up="1"]:visible');
            } else {
              _qItem = $(target).find('.easy_upload_queue_check[data-up="1"][data-check="yes"]:visible .easy_upload_queue_check[data-up="2"][data-check="yes"]:visible .easy_upload_queue_check[data-up="4"][data-check="yes"]:visible');
            }
            if (_qItem) {
              for (let i = 0; i < _qItem.length; i++) {
                let _index = $(_qItem[i]).parent().attr('data-index');
                res.push(_index);
              } 
            }
          }
          return res;
        },
        handleCheck (opts) {
          if (opts) {
            const _type = opts.type || 'all';
            const _checked = opts.checked || 'no';
            if (_type === 'all') {
              if (_checked === 'yes') {
                $(opts.target).html('&#xe61e').attr('data-check', 'yes');
                let _qItem = $(opts.target).parent().parent().find('.easy_upload_queue_check');
                if (_qItem) {
                  for (let i = 0; i < _qItem.length; i++) {
                    $(_qItem[i]).html('&#xe61e').attr('data-check', 'yes');
                  }
                }
              } else {
                $(opts.target).html('&#xe693').attr('data-check', 'no');
              }
            } else {
              if (_checked === 'yes') {
                $(opts.target).html('&#xe61e').attr('data-check', 'yes');
              } else {
                $(opts.target).html('&#xe693').attr('data-check', 'no');
              }
            }
          }
        },
        checkFile (fileArray) {
          const _typesArr = F.formatFileTypes(opts.allowFileTypes);
          const _allowFileSize = F.formatFileSize(opts.allowFileSize, true);

          if (fileArray && Array.isArray(fileArray) && 
            fileArray.length > 0) {
              for (let i = 0; i < fileArray.length; i++) {
                const _file = fileArray[i].file;
                const _type = _file.name.split('.').pop();
                const _size = _file.size || '0';
                if ($.inArray('*', _typesArr) > -1 || $.inArray(_type, _typesArr) > -1) {
                  if (parseInt(F.formatFileSize(_size, true)) <= parseInt(_allowFileSize)) {
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
        renderFile(fileArray, target) {
          const queueUi = $(target).parent().parent().find('.easy_upload-queue');
          if (fileArray && Array.isArray(fileArray) &&
            fileArray.length > 0) {
            function generateHtml (file) {
              if (!file || !file.file) {
                return;
              }

              const _file = file.file;

              let $html = '';
              let preview = '';
              let sHtml = '';

              const _type = _file.name.split('.').pop();
              if (_type === 'bmp' || _type === 'jpg' || _type === 'jpeg' || _type === 'png' || _type === 'gif') {
                let _url = URL.createObjectURL(_file);
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
              $html += opts.showPreview ? '<div class="easy_upload_preview">' + preview + '</div>' : ' ';
              $html += '<div class="easy_upload_progress-box">';
              $html += '<div class="easy_upload_fileName">' + _file.name +'</div>';
              $html += '<div class="easy_upload_progress">';
              $html += '<div class="easy_upload_bar"></div>';
              $html += '</div>'; // progress
              $html += '</div>'; // progress-box
              $html += '<div class="easy_upload_size-box">';
              $html += '<div class="easy_upload_size">' + F.formatFileSize(_file.size) + '</div>';
              $html += '<div class="easy_upload_percent">0%</div>';
              $html += '</div>' // size-box
              $html += '<div class="easy_upload_status">' + (file.allow ? sHtml : '<div class="status status6">文件不合法</div>') + '</div>';
              $html += '<div class="easy_upload_btnBox">';
              $html += file.allow ? '<div class="easy_upload-btn btn">上传</div>' : ' ';
              $html += '<div class="easy_delete_btn btn">删除</div>';
              $html += '</div>'; // upload_btnBox
              $html += opts.multi ? '<div class="easy_upload_queue_check easyUploadIcon queue_check_' + file.allow + '" data-check="no" data-up="1">&#xe693;</div>' : ' ';
              $html += '</li>';

              return $html;
            }

            if (opts.multi) {
              for (let i = 0; i < fileArray.length; i++) {
                let fileNum = $(queueUi).find('.easy_upload_queue_item:visible').length;
                if (fileNum < opts.multiNum) {
                  let $html = generateHtml(fileArray[i]);
                  $(queueUi).append($html);
                } else {
                  break;
                }
              }
            } else {
              let $html = generateHtml(fileArray[0]);
              $(queueUi).append($html);
            }
          }
        }
      };
      easyManager.init();      
    });
  }
})(jQuery);