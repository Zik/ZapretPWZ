// #==============================
// # UI: основной класс интерфейса
// #==============================
class UI {
    constructor() {
        // # CodeMirror
        // # Навигация (вкладки файлов)
        this.$tabs = document.querySelector('nav');
        // # Инициализация основных модулей UI
        this.buttons = this._initButtons();   // # Кнопки: save/restart/stop/start/theme/upgrade/logout
        this.tabs = this._initTabs();         // # Вкладки файлов
        this.textarea = this._initTextarea(); // # Редактор (CodeMirror как основной редактор внутри .textarea-container)
        this.version = this._initVersion();   // # Версия + проверка обновления
        this.popup = this._initPopups();      // # Попапы: alert/confirm/process
        this.login = this._initLoginForm();   // # Форма логина
    }

// #==========================
// # Вкладки: список файлов UI
// #==========================
    _initTabs() {
        const tabs = {};
        let currentFile = '';

        // # Добавить вкладку (файл)
        const add = (filename) => {
            const tab = document.createElement('div');
            tab.classList.add('nav-tab');
            tab.textContent = filename;

            const isConf = filename.endsWith('.conf');
            const isList = filename.endsWith('.list');
            const isLog = filename.endsWith('.log');

            // # Для .log показываем кнопку очистки
            if (isLog) {
                const clear = document.createElement('div');
                clear.classList.add('nav-clear');
                clear.setAttribute('title', 'Clear log');

                clear.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const yesno = await this.popup.confirm('Clear log?');
                    if (!yesno) return;

                    const result = await saveFile(filename, '');
                    if (!result.status) {
                        if (filename === currentFile) {
                            this.textarea.value = '';
                        }
                    } else {
                        this.popup.alert(`clear ${filename}`, `Error: ${result.status}`);
                    }
                });

                tab.appendChild(clear);

            // # Для "нестандартных" расширений — показываем корзину (удаление)
            } else if (!isConf && !isList) {
                tab.classList.add('secondary');

                const trash = document.createElement('div');
                trash.classList.add('nav-trash');
                trash.setAttribute('title', 'Delete file');

                trash.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const yesno = await this.popup.confirm('Delete file?');
                    if (!yesno) return;

                    const result = await removeFile(filename);
                    if (!result.status) {
                        remove(filename);
                    } else {
                        this.popup.alert(`remove ${filename}`, `Error: ${result.status}`);
                    }
                });

                tab.appendChild(trash);
            }

            // # Клик по вкладке — загрузка файла в редактор
            tab.addEventListener('click', async () => this.loadFile(filename));

                this.$tabs.appendChild(tab);
                tabs[filename] = tab;
            };

            // # Удалить вкладку (после удаления файла)
            const remove = (filename) => {
                for (const [key, tab] of Object.entries(tabs)) {
                if (key === filename) {
                    tab.parentNode.removeChild(tab);
                    delete tabs[key];

                // # Если удалили активный файл — пересохраним состояние и активируем первую вкладку
                if (filename === currentFile) {
                    this.textarea.save();
                    activateFirst();
                    }
                    break;
                 }
                }
            };

        // # Активировать вкладку по имени файла
        const activate = (filename) => {
            for (const [key, tab] of Object.entries(tabs)) {
                tab.classList.toggle('active', filename === key);
                if (filename === key) currentFile = filename;
            }
        };

        // # Активировать первую вкладку (если есть)
        const activateFirst = () => {
            const first = Object.values(tabs)[0];
            if (first) first.click();
        };

        return {
            add,
            remove,
            activate,
            activateFirst,
            get currentFileName() {
                return currentFile;
            }
        };
    }

// #=====================================
// # Редактор
// #=====================================
    _initTextarea() {
        // # Удаляем из DOM и строим CodeMirror как основной редактор внутри .textarea-container.

        const element = document.getElementById('config');     // # textarea из HTML
        const container = element.parentElement;               // # .textarea-container

        const initialText = element.value || '';
        element.parentNode.removeChild(element);               // # ВЫРЕЗАЕМ textarea полностью

        // # имитируем нажатие кнопки Save
        const saveHotkey = () => {
        // нажмём твою кнопку Save
            this.buttons.click();
        };
        // # Создаём CodeMirror
        const cm = CodeMirror(container, {
            mode: 'nfqws',          // # наш режим подсветки
            lineNumbers: true,      // # номера строк
            lineWrapping: false,    // # перенос строк выключен
            tabSize: 2,
            indentUnit: 2,
            scrollbarStyle: "simple",
            // Ctrl+S / Cmd+S -> сохранить через кнопку
            extraKeys: {
            "Ctrl-S": () => saveHotkey(),
            "Cmd-S":  () => saveHotkey(),
             },
        });
        
        // # Скроллбары: показываем при wheel и при наведении на край (hot zones)
        (function setupScrollbarsHoverZones(cm) {
        const wrapper = cm.getWrapperElement();
        let hideTimer = null;
        let lockedByHover = false;

        const show = (ms = 1200) => {
            wrapper.classList.add('cm-scrollbars-show');
            if (hideTimer) clearTimeout(hideTimer);

            // если "стоим на краю" — не прячем по таймеру
            if (lockedByHover) return;

            hideTimer = setTimeout(() => {
            wrapper.classList.remove('cm-scrollbars-show');
            }, ms);
        };

        const hideSoon = (ms = 400) => {
            lockedByHover = false;
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => wrapper.classList.remove('cm-scrollbars-show'), ms);
        };

        // # 1) Колесо / трекпад
        wrapper.addEventListener('wheel', () => show(1200), { passive: true });
            cm.on('scroll', () => show(1200));

        // # 2) Hot zones по краям
        const makeZone = (cls) => {
        const z = document.createElement('div');
            z.className = `cm-scroll-hotzone ${cls}`;
            wrapper.appendChild(z);
            return z;
        };

        const zoneV = makeZone('v');
        const zoneH = makeZone('h');

        const onEnter = () => {
            lockedByHover = true;
            wrapper.classList.add('cm-scrollbars-show'); // держим постоянно
            if (hideTimer) clearTimeout(hideTimer);
        };

        const onLeave = () => {
        // ушёл с края — чуть подождём и спрячем
        hideSoon(500);
        };

        zoneV.addEventListener('mouseenter', onEnter);
        zoneV.addEventListener('mouseleave', onLeave);
        zoneH.addEventListener('mouseenter', onEnter);
        zoneH.addEventListener('mouseleave', onLeave);
        })(cm);

        cm.setValue(initialText);

        // # Храним "оригинальный текст" чтобы понимать, изменён файл или нет
        let originalText = cm.getValue();
        let textChanged = false;

        // # Сохранение состояния "не изменён"
        const save = () => {
            originalText = cm.getValue();
            textChanged = false;
            this.setChanged(false);
        };

        // # Дебаунс проверки "изменилось ли"
        const updateChanged = _debounce(() => {
            textChanged = cm.getValue() !== originalText;
            this.setChanged(textChanged);
        }, 300);

        // # Любое изменение в редакторе — проверяем changed
        cm.on('change', updateChanged);

        // # Ctrl+S — сохранить файл (через кнопку Save)
        cm.on('keydown', (_cm, e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.buttons.click();
            }
        });

        // # Возвращаем совместимый интерфейс, как раньше у textarea (value/changed/save/readonly/disabled)
        return {
            applyFile(filename, text) {
            cm.operation(() => {
            // сначала ставим нужный mode под этот файл
            this.setModeFor(filename);

            // потом меняем текст
            cm.setValue(text);
            });

            save();      // считаем "не изменено"
            cm.refresh();
            },

            // # Текущий текст в редакторе
            get value() {
                return cm.getValue();
            },

            // # Установить текст в редакторе (обычно при загрузке файла)
            set value(text) {
                cm.setValue(text);
                save();             // # после загрузки файла считаем "не изменён"
                cm.refresh();       // # на всякий случай обновим layout
            },

            // # Флаг изменённости
            get changed() {
                return textChanged;
            },

            // # Сбросить изменённость (после успешного сохранения)
            save,

            // # Глобально отключить редактор (на время запросов/попапов)
            disabled(status) {
                cm.setOption('readOnly', status ? 'nocursor' : false);
            },

            // # Режим read-only (например для .log)
            readonly(status) {
                cm.setOption('readOnly', status ? true : false);
            },

            // # Переключение режима подсветки по имени файла (если нужно)
            setModeFor(filename) {
            // # .log — без подсветки вообще
            if (filename.endsWith('.log')) {
            cm.setOption('mode', null);
            return;
            }
            // # .list — nfqws, но без подсветки цифр
            if (filename.endsWith('.list')) {
            cm.setOption('mode', { name: 'nfqws', noNumbers: true, noOperators: true });
            return;
            }
            // # остальное (.conf и т.п.) — полный nfqws
            cm.setOption('mode', 'nfqws');
            },

        };
    }

// #=====================
// # Версия и обновления
// #=====================
    _initVersion() {
        const element = document.getElementById('version');
        const match = element.textContent.match(/^v([0-9]+)\.([0-9]+)\.([0-9]+)$/);

        const value = () => {
            return match ? [match[1], match[2], match[3]] : null;
        };

        const checkUpdate = async () => {
            if (!value()) return;

            const latest = await getLatestVersion();
            if (!latest) return;

            const updateAvailable = compareVersions(value(), latest);
            if (updateAvailable) {
                const link = document.createElement('a');
                const tag = `v${latest[0]}.${latest[1]}.${latest[2]}`;
                link.textContent = `(${tag})`;
                link.href = `https://github.com/Anonym-tsk/nfqws-keenetic/releases/tag/${tag}`;
                link.target = '_blank';
                element.appendChild(link);
            }
        };

        return {
            get value() {
                return value();
            },
            checkUpdate,
        };
    }

// #==========================
// # Попапы: alert/confirm/run
// #==========================
    _initPopups() {
        const element = document.getElementById('alert');
        const alertContent = element.querySelector('.popup-content');
        const buttonClose = element.querySelector('.popup-close');
        const buttonYes = element.querySelector('.popup-yes');
        const buttonNo = element.querySelector('.popup-no');

        // # Простой alert
        const alert = (...text) => {
            this.disableUI();
            alertContent.textContent = `> ${text.join("\n")}`;
            element.classList.add('alert');
            element.classList.remove('hidden', 'confirm', 'locked');
        };

        // # Скрыть попап
        const hide = () => {
            element.classList.add('hidden');
            element.classList.remove('locked');
            this.enableUI();
        };

        // # Confirm (да/нет)
        const confirm = async (text) => {
            this.disableUI();
            alertContent.textContent = text;
            element.classList.add('confirm');
            element.classList.remove('hidden', 'alert', 'locked');

            return new Promise((resolve) => {
                buttonYes.addEventListener('click', function ok() {
                buttonYes.removeEventListener('click', ok);
                    resolve(true);
                });
                buttonNo.addEventListener('click', function fail() {
                buttonNo.removeEventListener('click', fail);
                    resolve(false);
                });
            });
        };

        // # Выполнить действие и показать вывод в попапе (process)
        const process = async (text, fn, ...args) => {
            this.disableUI();
            alertContent.textContent = `> ${text}\n`;
            element.classList.add('alert', 'locked');
            element.classList.remove('hidden', 'confirm');
            let status = true;

        const result = await fn(...args);
            if (!result.status) {
                alertContent.textContent += Array.from(result.output).join("\n");
            } else {
                alertContent.textContent += `Error: ${result.status}`;
                status = false;
            }
            element.classList.remove('locked');

            return new Promise((resolve) => {
                buttonClose.addEventListener('click', function close() {
                buttonYes.removeEventListener('click', close);
                resolve(status);
                });
            });
        };

        // # Хэндлеры закрытия
        buttonClose.addEventListener('click', hide);
        buttonYes.addEventListener('click', hide);
        buttonNo.addEventListener('click', hide);

        return {
            alert,
            confirm,
            process,
        };
    }

// #=================
// # Форма логина UI
// #=================
    _initLoginForm() {
        const element = document.getElementById('login-form');
        const login = document.getElementById('login');
        const password = document.getElementById('password');
        const buttonYes = element.querySelector('.popup-yes');

        // # Отправить логин/пароль
        const submit = async () => {
            element.classList.add('hidden');
        const result = await _postData({ cmd: 'login', user: login.value, password: password.value });
            if (!result.status) {
                window.location.reload();
            }
        };

        // # Показать форму логина
        const show = () => {
            this.disableUI();
            login.value = '';
            password.value = '';
            element.classList.remove('hidden');
        };

        // # Enter в полях
        login.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submit();
        });
        password.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submit();
        });

        // # Кнопка OK
        buttonYes.addEventListener('click', submit);

        return {
            show,
            async logout() {
                await _postData({ cmd: 'logout' });
                window.location.reload();
            },
        };
    }

// #=========================
// # Статусы "running/changed"
// #=========================
    setStatus(status) {
        document.body.classList.toggle('running', status);
    }

    setChanged(status) {
        document.body.classList.toggle('changed', status);
    }

    isChanged() {
        return document.body.classList.contains('changed');
    }

// #====================
// # Кнопки управления UI
// #====================
    _initButtons() {
        const btnReload = document.getElementById('reload');
        const btnRestart = document.getElementById('restart');
        const btnStop = document.getElementById('stop');
        const btnStart = document.getElementById('start');
        const btnDropdown = document.getElementById('dropdown');
        const menuDropdown = document.getElementById('dropdown-menu');
        const btnSave = document.getElementById('save');
        const btnTheme = document.getElementById('theme');
        const btnUpgrade = document.getElementById('upgrade');
        const btnLogout = document.getElementById('logout');

        // # Универсальный confirm + запуск экшена сервиса
        const nfqwsActionClick = async (action, text) => {
        const yesno = await this.popup.confirm(text);
            if (!yesno) return;

        const result = await this.popup.process(`nfqws-keenetic ${action}`, serviceAction, action);
            if (result) {
                if (action === 'stop') {
                    this.setStatus(false);
                } else if (action === 'start' || action === 'restart') {
                    this.setStatus(true);
                }
            }
            return result;
        };

        // # Привязка кнопок
        btnReload.addEventListener('click', () => nfqwsActionClick('reload', 'Reload service?'));
        btnRestart.addEventListener('click', () => nfqwsActionClick('restart', 'Restart service?'));
        btnStop.addEventListener('click', () => nfqwsActionClick('stop', 'Stop service?'));
        btnStart.addEventListener('click', () => nfqwsActionClick('start', 'Start service?'));
        btnTheme.addEventListener('click', () => this.toggleTheme());

        btnUpgrade.addEventListener('click', async () => {
            const result = await nfqwsActionClick('upgrade', 'Update nfqws-keenetic?');
            if (result) window.location.reload();
        });

        btnLogout.addEventListener('click', () => this.login.logout());

        // # Дропдаун меню
        btnDropdown.addEventListener('click', () => {
        menuDropdown.classList.toggle('hidden');
        });

            const hideMenu = _debounce(() => {
        menuDropdown.classList.add('hidden');
        }, 500);

        btnDropdown.addEventListener('focusout', hideMenu);
        menuDropdown.addEventListener('mouseleave', hideMenu);
        menuDropdown.addEventListener('mouseenter', () => hideMenu.stop());

        // # Save — сохраняем текущий файл
        btnSave.addEventListener('click', async () => {
            if (!this.isChanged()) return;

            const result = await saveFile(this.tabs.currentFileName, this.textarea.value);
            if (!result.status) {
                this.textarea.save();
            } else {
                this.popup.alert(`save ${this.tabs.currentFileName}`, `Error: ${result.status}`);
            }
        });

        return {
            click() {
                btnSave.click();
            },
        };
    }

// #==========================
// # Загрузка файла в редактор
// #==========================
    async loadFile(filename) {
    // # Предупреждение о несохранённых изменениях
    if (this.textarea.changed) {
        const yesno = await this.popup.confirm('File is not saved, close?');
        if (!yesno) return;
    }

    // # Активируем вкладку
    this.tabs.activate(filename);

    // # Загружаем контент файла
        const content = await getFileContent(filename);

    // # Применяем режим подсветки + текст атомарно (убирает "мигание")
    if (typeof this.textarea.applyFile === 'function') {
        this.textarea.applyFile(filename, content);
    } else {
    // fallback (если applyFile ещё не добавлен)
    if (typeof this.textarea.setModeFor === 'function') {
        this.textarea.setModeFor(filename);
        }
        this.textarea.value = content;
    }

    // # .log делаем read-only
    this.textarea.readonly(filename.endsWith('.log'));
    }


// #==========================
// # Включение/отключение UI
// #==========================    
    disableUI() {
        this.textarea.disabled(true);
        document.body.classList.add('disabled');
    }

    enableUI() {
        this.textarea.disabled(false);
        document.body.classList.remove('disabled', 'unknown');
    }

// #==========================
// # Переключение темы (light/dark)
// #==========================
    toggleTheme() {
        const root = document.querySelector(':root');
        const theme = (root.dataset.theme === 'dark') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        root.dataset.theme = theme;
    }
}

// #=============================
// # Debounce: задержка вызова fn
// #=============================
function _debounce(func, ms) {
    let timeout;

    function wrapper(..._args) {
        const _this = this;

        if (timeout) {
            window.clearTimeout(timeout);
        }

        timeout = window.setTimeout(() => {
            func.apply(_this, _args);
        }, ms);
    }

    wrapper.stop = () => {
        if (timeout) {
            window.clearTimeout(timeout);
        }
    };

    return wrapper;
}

// #=========================
// # POST API к index.php
// #=========================
async function _postData(data) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
    }

    try {
        const response = await fetch('index.php', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            return await response.json();
        }

        if (response.status === 401) {
            ui?.login.show();
        }
        return { status: response.status, statusText: response.statusText };
    } catch (e) {
        return { status: 975 };
    }
}

// #=========================
// # API: файлы и сервис
// #=========================
async function getFiles() {
    return _postData({ cmd: 'filenames' });
}

async function getFileContent(filename) {
    const data = await _postData({ cmd: 'filecontent', filename });
    return data.content || '';
}

async function saveFile(filename, content) {
    return _postData({ cmd: 'filesave', filename, content });
}

async function removeFile(filename) {
    return _postData({ cmd: 'fileremove', filename });
}

async function serviceAction(action) {
    return _postData({ cmd: action });
}

// #=========================
// # GitHub: последняя версия
// #=========================
async function getLatestVersion() {
    try {
        const response = await fetch('https://api.github.com/repos/Anonym-tsk/nfqws-keenetic/releases/latest');
        const data = await response.json();
        const tag = data.tag_name;
        const match = tag.match(/^v([0-9]+)\.([0-9]+)\.([0-9]+)$/);
        return [match[1], match[2], match[3]];
    } catch (e) {
        return null;
    }
}

// #=========================
// # Сравнение версий
// #=========================
function compareVersions(current, latest) {
    const v1 = latest[0] - current[0];
    const v2 = latest[1] - current[1];
    const v3 = latest[2] - current[2];
    if (v1) return v1 > 0;
    if (v2) return v2 > 0;
    if (v3) return v3 > 0;
    return false;
}

// #=========================
// # Старт приложения
// #=========================
const ui = new UI();
ui.version.checkUpdate();

// # ВНИМАНИЕ: тут top-level await, значит script.js должен грузиться как type="module"
const response = await getFiles();
ui.setStatus(response.service);

if (response.files?.length) {
    for (const filename of response.files) {
        ui.tabs.add(filename);
    }
    ui.tabs.activateFirst();
    ui.enableUI();
}
