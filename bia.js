var biaUtils = {
	last: function (arr) {
		return arr.length === 0 ? null : arr[arr.length - 1];
	}
};

$(function () {
	var courses = ['30467', '30873', '5947'];
	var course_id = (ENV.COURSE_ID || location.pathname.match('\/courses\/(.*?)\/')[1]) + '';
	var courseUrlRegex = '^\/courses\/(?:' + courses.join('|') + ')';
  var baseCourseUrl = 'https://canvas.bham.ac.uk/courses/' + course_id;
  var baseApiCourseUrl = 'https://canvas.bham.ac.uk/api/v1/courses/' + course_id;
	var modulesUrl = baseCourseUrl + '/modules';
	var gradesUrl = baseCourseUrl + '/grades';
	var isStudent = !hasAnyRole('teacher', 'admin');
  var baseStorageKey = 'ayae_';
  var buttonAttributes = 'style="text-decoration: none" class="bg-blue hover:bg-blue-dark text-white font-bold py-2 px-4 rounded"';

	if (courses.indexOf(course_id) !== -1 && isStudent) {
    onPage(new RegExp(courseUrlRegex + '\/?$'), initializeHandler);
    onPage(new RegExp(courseUrlRegex), courseItemHandler);
    onPage(new RegExp(courseUrlRegex + '\/pages\/menu'), menuHandler);
    onPage(new RegExp(courseUrlRegex + '\/grades'), gradesHandler);
    onPage(new RegExp(courseUrlRegex + '\/modules'), moduleHandler);
    onPage(new RegExp(courseUrlRegex + '\/pages\/certificate-of-completion'), certificateHandler);
	}


	// ------------------------------------------------------------
	// Core Functions
	// ------------------------------------------------------------

  function initializeHandler() {
    // Retrieve modules
		$.get(modulesUrl, function (data) {
      var $modulesPage = $(data);
      var $modules = $modulesPage.find('.context_module[id*="context_module_"]');
      var modules = [];

      $modules.each(function () {
        var id = biaUtils.last($(this).attr('id').split('_'));

        if (!id || id === 'blank') {
          return;
        }

        var moduleObject = {};

        moduleObject.id = id;

        var label = $(this).attr('aria-label');

        var title = label.match(/^(.*?)\[/);
        moduleObject.title = title === null ? '' : title[1];

        var assessmentType = label.match(/.*?TYPE:(.*?)(?:,.*?)?\]$/);
        moduleObject.assessment_type = (assessmentType === null ? 'both' : assessmentType[1]).toLowerCase();

        var accessibility = label.match(/.*?ACCESSIBILITY:(.*?)(?:,.*?)?\]$/);
        moduleObject.accessibility = (accessibility === null ? 'top_level' : accessibility[1]).toLowerCase();

        moduleObject.items = $(this).find('[id*="context_module_item_"]:not(.context_module_sub_header)').map(function () {
          var $row = $(this).find('.ig-row');
				  var $info = $row.find('.ig-info');
          var $title = $info.find('.module-item-title .ig-title').first();

          return {
            id: biaUtils.last(this.id.split('_')),
            title: $title.text().trim()
          }
        }).get();

        moduleObject.extra_info = $(this).find('[id*="context_module_item_"].context_module_sub_header').map(function () {
          return $(this).find('.module-item-title .title').first().text().trim();
        }).get();

        modules.push(moduleObject);
      });

      storageSet('modules', modules);
    });

    // Attach event handlers to choice buttons
    $('#ayae-mandatory-choice').on('click', function () {
      storageSet('assessment_type', 'mandatory');
    });

    $('#ayae-diagnostic-choice').on('click', function () {
      storageSet('assessment_type', 'diagnostic');
    });
  }

	function courseItemHandler() {
		var $wrapper = $('#wrapper');
		var $contentWrapper = $('#content-wrapper');

    // Style wrapper
    $wrapper.css({
      margin: '0 auto',
      padding: '0 65px'
    });
    $wrapper.find('#main').css('margin', '0');
    $contentWrapper.find('#content').css('padding', '0');
    $contentWrapper.find('#content .user_content').css('padding', '0 32px')

		// Hide nav toggle and crumbs
		$wrapper.find('.ic-app-nav-toggle-and-crumbs').hide();

		// Hide header bar
		$contentWrapper.find('.header-bar-outer-container').hide();

		// Hide right sidebar
		$('#right-side-wrapper').hide();

		// Hide left sidebar
		$('#left-side').hide();

		// Add custom navigation (top horizontal bar)
    setNavigationBar();

		// Set assessment type and navigation settings
    setLastVisitedModuleItem();
		setNavigation();

    // Hide footer bar
    var footerInterval = setInterval(function () {
      if ($contentWrapper.find('.module-sequence-footer').length) {
        $contentWrapper.find('.module-sequence-footer').hide();
        clearInterval(footerInterval);
      }
    }, 700);
	}

  function menuHandler() {
    // Get content wrapper
		var $contentWrapper = $('#content-wrapper');

		// Hide page title
    $contentWrapper.find('.page-title').hide();

    // Build menu page
    // --------------------------------------------------
    var assessmentType = storageGet('assessment_type');
    var modules = [];
    storageGet('modules').forEach(function (m) {
      if (m.accessibility === 'menu' && (m.assessment_type === assessmentType || m.assessment_type === 'both')) {
        modules.push(m);
      }
    });
    var $modules = $('<div class="bia"></div>');

    modules.forEach(function (m) {
      var $module = $('<div class="mb-8"></div>');

      $module.append('<h2 class="text-2xl text-grey-darkest border-l-2 pl-3">' + m.title + '</h2>');

      m.extra_info.forEach(function (info) {
        $module.append('<p class="mb-3">' + info + '</p>');
      });

      var $itemsList = $('<div class="p-0 ml-0 border rounded"></div>');
      m.items.forEach(function (item, index) {
        $itemsList.append('<div class="border-b bg-grey-lightest p-4"><a class="text-base" href="' + modulesUrl + '/items/' + item.id + '" target="_blank">' + (index + 1) + '. ' + item.title + '</a></div>');
      });
      $module.append($itemsList);

      $modules.append($module);
    });

    $contentWrapper.find('.user_content').append($modules);
  }

  function moduleHandler() {
    var match = location.hash.match(/module_(.*)/);

    if (!match) {
      return;
    }

    var moduleId = match[1];

    $('#context_modules > [id*="context_module_"]').each(function () {
      var id = biaUtils.last($(this).attr('id').split('_'));

      if (id !== moduleId) {
        $(this).remove();
      } else {
        $(this).find('.ig-header').remove();
      }
    });
  }

  function gradesHandler() {
    cleanGradesPage();
  }

  function cleanGradesPage($page) {
    if (!$page) {
      $page = $(document.body);
    }

    $page.find('#print-grades-container').hide();
    $page.find('#GradeSummarySelectMenuGroup').hide();

    $page.find('#grades_summary [id*="submission_"]').each(function () {
      $(this).find('.assignment_score .grade span').remove();
      var grade = $(this).find('.assignment_score .grade').text().trim();
      var possiblePoints = $(this).find('.points_possible').text().trim();

      if (grade === '-') {
        $(this).hide();
      } else if (grade === '0' && possiblePoints === '0') {
        $(this).find('.points_possible').text('-');
        $(this).find('.assignment_score .grade').text('-');
      }
    });
  }

  function certificateHandler() {
    var $contentWrapper = $('#content-wrapper');

		// Hide page title
    $contentWrapper.find('.page-title').hide();

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.4.1/html2canvas.min.js', function () {
      loadScript('https://unpkg.com/jspdf@latest/dist/jspdf.min.js', _certificateHandler);
    });

    // Load JS to PDF library
    /*var jsToPdfScript = document.createElement('script');
    jsToPdfScript.onload = _certificateHandler;
    jsToPdfScript.src = 'https://unpkg.com/jspdf@latest/dist/jspdf.min.js';
    document.body.appendChild(jsToPdfScript);*/

    // Append download button
    /*var $div = $('<div class="bia"></div>');
    var $downloadButton = $('<a href="javascript:;" ' + buttonAttributes + '>Download</a>');
    $downloadButton.addClass('icon-download mt-4');
    $div.append($downloadButton);

    $contentWrapper.find('#content .user_content').append($div);*/

    function _certificateHandler() {
      var assessmentType = storageGet('assessment_type');

      if (assessmentType === 'mandatory') {
        $.get(gradesUrl, function (data) {
          var $gradesPage = $(data);
          cleanGradesPage($gradesPage);

          var $pdfContent = $('<div id="pdf-content"></div>');
          var $pdfContentInner = $('<div></div>');
          $pdfContent.css({
            position: 'fixed',
            right: '-100em'
          });
          $pdfContentInner.append('<h1 style="text-align: center">Certificate of completion and summary of scores</h1>');
          $pdfContentInner.append('<p>This certificate is to confirm that ' + ENV.current_user.display_name + ' has successfully completed the core content of the "Assess your Academic English!" course.</p>');
          $pdfContentInner.append($gradesPage);
          $pdfContent.append($pdfContentInner);
          $(document.body).append($pdfContent);

          var pdf = new jsPDF('p', 'pt', 'letter');
          var canvas = pdf.canvas;
          pdf.canvas.height = 72 * 11;
          pdf.canvas.width = 72 * 8.5;

          html2canvas($('#pdf-content > div').get(0), {
              canvas: canvas,
              onrendered: function (canvas) {
                var iframe = document.createElement('iframe');
                iframe.setAttribute('style','width:100%');
                $contentWrapper.find('#content .user_content').append(iframe);
                iframe.src = pdf.output('datauristring');
              }
          });
        });

        /*$downloadButton.on('click', function (event) {
          event.preventDefault();

          $.get(gradesUrl, function (data) {
            var $gradesPage = $(data);
            $gradesPage = cleanGradesPage($gradesPage);

            var $pdfContent = $('<div></div>');
            $pdfContent.append('<h1 style="text-align: center">Certificate of completion and summary of scores</h1>');
            $pdfContent.append('<p>This certificate is to confirm that ' + ENV.current_user.display_name + ' has successfully completed the core content of the "Assess your Academic English!" course.</p>');
            $pdfContent.append($gradesPage);

            var doc = new jsPDF();

            doc.fromHtml($pdfContent.get(0), 15, 15, {
              'width': 170
            });
            doc.save('certificate-of-completion.pdf');
          });
        });*/
      } else {

      }
    }
  }

	function setLastVisitedModuleItem() {
		var moduleItemId = getQueryStringParam('module_item_id');

		if (location.pathname.indexOf('task-list') < 0 && moduleItemId) {
			storageSet('last_visited_module_item', moduleItemId);
		}
	}

	function setNavigation() {
    var moduleItemId = getQueryStringParam('module_item_id');
    var modules = storageGet('modules');
    var moduleObject = modules.filter(function (m) {
      return m.items.map(function (item) { return item.id; }).indexOf(moduleItemId) >= 0;
    });

    if (moduleObject.length === 0) {
      // TODO: exception?
    }

    moduleObject = moduleObject[0];

		if (location.pathname.indexOf('task-list') < 0 && moduleItemId) {
			var $outer = $('<div class="bia"></div>');
			var $inner = $('<div class="flex justify-between my-8"></div>');
      var moduleIndex = moduleObject.items.map(function (item) { return item.id; }).indexOf(moduleItemId);

      // Back button
      var $backButton

			if (moduleIndex - 1 >= 0) {
        var prevModule = moduleObject.items[moduleIndex - 1]
				$backButton = $('<a href="' + modulesUrl + '/items/' + prevModule.id  + '" ' + buttonAttributes + '>Back</a>');
      } else {
        $backButton = $('<button class="bg-blue text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed">Back</button>');
      }
      $inner.append($backButton);

      // Menu button
      var menuItem = getMenuItem();

      if (menuItem !== null) {
        $inner.append('<a href="' + modulesUrl + '/items/' + menuItem.id + '"' + buttonAttributes + '>Menu</a>');
      }

      // Next button
      var $nextButton;

			if (moduleIndex + 1 < moduleObject.items.length) {
        var nextModule = moduleObject.items[moduleIndex + 1];
				$nextButton = $('<a href="' + modulesUrl + '/items/' + nextModule.id + '" ' + buttonAttributes + '>Next</a>');
			} else {
        $nextButton = $('<button class="bg-blue text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed">Next</button>');
      }
      $inner.append($nextButton);

			$outer.append($inner);
			$('#content').append($outer);
		}
  }

  function setNavigationBar() {
    var menuItem = getMenuItem();
    var menuLink = menuItem === null ? '' : `
      <a href="${modulesUrl}/items/${menuItem.id}" style="color: #E7D415" class="block mt-4 text-lg font-bold lg:inline-block lg:mt-0 hover:text-white mr-4">
        Menu
      </a>`;

    var navigation = `
		<div class="bia">
			<nav style="background-color: #E5087C; box-sizing: border-box;" class="flex mb-8 w-full rounded-b shadow-md items-center justify-between flex-wrap p-6">
				<div class="flex items-center flex-no-shrink text-white mr-6">
					<span class="font-semibold text-xl tracking-tight">AYAE 2018/19</span>
				</div>
				<div class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
					<div class="text-sm lg:flex-grow">
						<a href="${baseCourseUrl}" style="color: #E7D415" class="block mt-4 text-lg font-bold lg:inline-block lg:mt-0 hover:text-white mr-4">
							Home
            </a>
            ${menuLink}
						<a href="${gradesUrl}" style="color: #E7D415" class="block mt-4 text-lg font-bold lg:inline-block lg:mt-0 hover:text-white mr-4">
							Feedback
            </a>
					</div>
				</div>
			</nav>
		</div>
    `;

    $('#content-wrapper').prepend(navigation);
  }

  function getMenuItem() {
    var menuItem = null;
    var modules = storageGet('modules');
    var assessmentType = storageGet('assessment_type');

    modules.forEach(function (m) {
      m.items.forEach(function (item) {
        if (item.title.toLowerCase().indexOf('menu') >= 0 && m.assessment_type === assessmentType) {
          menuItem = item;
        }
      });
    });

    return menuItem
  }

	// ------------------------------------------------------------
	// Utility Functions
	// ------------------------------------------------------------

	function getQueryStringParam(sParam) {
		var sPageURL = window.location.search.substring(1);
		var sURLVariables = sPageURL.split('&');
		for (var i = 0; i < sURLVariables.length; i++)  {
				var sParameterName = sURLVariables[i].split('=');
				if (sParameterName[0] == sParam) {
						return sParameterName[1];
				}
		}
	}

	function hasAnyRole(/* role1, role2... */) {
		var roles = [].slice.call(arguments, 0);

		if (typeof ENV != "object") return false
		if (typeof ENV.current_user_roles != "object") return false
		if (ENV.current_user_roles == null) return false

		for (var i = 0; i < roles.length; i++) {
			if (ENV.current_user_roles.indexOf(roles[i]) !== -1) return true
		}

		return false
	}

	function onPage(regex, fnTrue, fnFalse) {
		var match = location.pathname.match(regex);

		if (match) {
			fnTrue(match);
		} else if (arguments[2]) {
			fnFalse();
		}
	}

	function storageGet(key) {
		return JSON.parse(localStorage.getItem(baseStorageKey + key));
	}

	function storageSet(key, value) {
		localStorage.setItem(baseStorageKey + key, JSON.stringify(value));
  }

  function api(method, url) {
    return new Promise(function (resolve, reject) {
      $[method](baseApiCourseUrl + url, function (data) {
        resolve(data);
      });
    });
  }

  function loadScript(url, callback) {
    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState) {  //IE
      script.onreadystatechange = function () {
        if (script.readyState == "loaded" ||
          script.readyState == "complete") {
          script.onreadystatechange = null;
          callback();
        }
      };
    } else {  //Others
      script.onload = callback;
    }

    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
    // document.body.appendChild(script);
  }
});
