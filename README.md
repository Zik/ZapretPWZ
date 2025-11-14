# ZapretPWZ    |                ✅[DPI CHECKER](https://zik.github.io/ZapretPWZ/)
### NFQWS, что это?

`nfqws` - утилита для модификации TCP соединения на уровне пакетов, работает через обработчик очереди NFQUEUE и raw сокеты.

Почитать подробнее можно на [странице авторов](https://github.com/bol-van/zapret) (ищите по ключевому слову `nfqws`).

Полная инструкция по настройке nfqws-keenetic от [Anonym-tsk](https://github.com/Anonym-tsk/nfqws-keenetic) на Keenetic (Netcraze)
> [!IMPORTANT]
> Данный материал подготовлен в научно-технических целях.
> Использование предоставленных материалов в целях отличных от ознакомления может являться нарушением действующего законодательства.
> Автор не несет ответственности за неправомерное использование данного материала.

> [!WARNING]
> **Вы пользуетесь этой инструкцией на свой страх и риск!**
> 
> Автор не несёт ответственности за порчу оборудования и программного обеспечения, проблемы с доступом и потенцией.
> Подразумевается, что вы понимаете, что вы делаете.
---
## Список проверенных устройств Keenetic/Netcraze. Так же список на исходнике [Исходник](https://github.com/Anonym-tsk/nfqws-keenetic/discussions/1).
<details>
  <summary>Список (раскрывается)</summary>
   
  - Zyxel Keenetic II
  - Zyxel Keenetic III
  - Zyxel Keenetic Giga II
  - Zyxel Keenetic Giga III
  - Zyxel Keenetic Extra
  - Zyxel Keenetic Extra II
  - Zyxel Keenetic Ultra
  - Zyxel Keenetic Ultra II
  - Keenetic Giga (KN-1010)
  - Keenetic Giga (KN-1011)
  - Keenetic Giga (KN-1012)
  - Keenetic 4G (KN-1212)
  - Keenetic Omni (KN-1410)
  - Keenetic Extra (KN-1710)
  - Keenetic Extra (KN-1711)
  - Keenetic Extra (KN-1713)
  - Keenetic Ultra (KN-1810)
  - Keenetic Ultra (KN-1811)
  - Keenetic Viva (KN-1910)
  - Keenetic Viva (KN-1912)
  - Keenetic Viva (KN-1913)
  - Keenetic DSL (KN-2010)
  - Keenetic Launcher DSL (KN-2012)
  - Keenetic Duo (KN-2110)
  - Keenetic Skipper DSL (KN-2112)
  - Keenetic Runner 4G (KN-2211)
  - Keenetic Hero 4G+ (KN-2311)
  - Keenetic Giga SE (KN-2410)
  - Keenetic Giant (KN-2610)
  - Keenetic Peak (KN-2710)
  - Keenetic Hopper DSL (KN-3610)
  - Keenetic Hopper (KN-3810)
  - Keenetic Hopper (KN-3811)
  - Keenetic Hopper SE (KN-3812)
</details>

---

### 1. Подготовка 
1.1 Игнорируем предложенные провайдером адреса DNS-сервера. Для этого в интерфейсе роутера отметьте пункты ["игнорировать DNS от провайдера"](https://help.keenetic.com/hc/ru/articles/360008609399) в настройках IPv4 и IPv6. И ставим свои (на выбор полно в инете: "ок, гугл, проверенные днс сервера"). Желательно использовать [настроить использование DoT/DoH](https://help.keenetic.com/hc/ru/articles/360007687159). А так же в разделе "Интернет-фильтры" отключить все сторонние фильтры (NextDNS, SkyDNS, Яндекс DNS и другие).

1.2 Через web-интерфейс Keenetic/Netcraze установить пакеты **Протокол IPv6** (**Network functions > IPv6**) и **Модули ядра подсистемы Netfilter** (**OPKG > Kernel modules for Netfilter** - не путать с "Netflow"). Обратите внимание, что второй компонент отобразится в списке пакетов только после того, как вы отметите к установке первый.
> [!IMPORTANT]
> На данный момент, начиная с прошивки 5.0, **Протокол IPv6** является встроенным компонентом, поэтому этот пункт пропускаем, и сразу устанавливаем **Модули ядра подсистемы Netfilter**


1.3 Установливаем Entware на маршрутизатор по инструкции [на встроенную память роутера](https://help.keenetic.com/hc/ru/articles/360021888880) или [на USB-накопитель](https://help.keenetic.com/hc/ru/articles/360021214160).
> [!IMPORTANT]
> Все дальнейшие команды выполняются не в CLI (командной строке) роутера, а **в среде Entware**. Подключиться в неё можно несколькими способами, указанными в следующем пункте.

### 2. Заходим в Entware
- Через telnet: в терминале выполнить `telnet 192.168.1.1`, а потом `exec sh`.
- Или же подключиться напрямую через SSH (можно через powershell): В терминале пишем `ssh admin@192.168.1.1 -p 222`. (порт - 222 или 22, если не меняли сами в настройках keenetic). Когда запросит `пароль`, пишем тот, который установлен для пользователя `admin`.

Когда попали в CLI, увидим:
```
KeeneticOS version 5.00.C.0.0-0, copyright (c) 2010-2025 Keenetic Ltd.
This software is a subject of Keenetic Ltd. end-user licence agreement. By using it you agree on terms and conditions
hereof. For more information please check https://keenetic.com/legal
(config)>
```
Пишем `exec sh`, оказываемся в `Entware`.
> [!IMPORTANT]
> Задаем пароль для пользователя `root` в `Entware` (по умолчанию пароль стоит `keenetic`): пишем `passwd` и указываем новый пароль (запоминаем, пригодится позже).
> 
### 3. Устанавливаем необходимые зависимости
3.1 Пишем в `Entware`:
   ```
   opkg update
   opkg install ca-certificates wget-ssl
   opkg remove wget-nossl
   ```
3.2 Устанавливаем opkg-репозиторий в систему
   ```
   mkdir -p /opt/etc/opkg
   echo "src/gz nfqws-keenetic https://anonym-tsk.github.io/nfqws-keenetic/all" > /opt/etc/opkg/nfqws-keenetic.conf
   ```
   Репозиторий универсальный, поддерживаемые архитектуры: `mipsel`, `mips`, `mips64`, `aarch64`, `armv7`, `x86`, `x86_64`, `lexra`.
### 4. Установка самого NFQWS
4.1 Установка NFQWS
    ```
    opkg update
    opkg install nfqws-keenetic
    ```
4.2 Установка веб-интерфейса (опционально), для удобства рекомендую установить
   ```
   opkg install nfqws-keenetic-web
   ```
> [!NOTE]
> Адрес веб-интерфейса `http://<router_ip>:90` (например http://192.168.1.1:90)<br/>
> Для авторизации введите имя пользователя `root` и пароль пользователя Entware (тот который задали командой `passwd`)

> [!TIP]
> По-умолчанию php использует только 8Мб памяти. Из-за этого ограничения, могут не загружаться большие списки файлов.
> Вы можете изменить конфигурацию php самостоятельно:<br/>
> Откройте файл по пути (зависит от того куда установили Entware: Встроенной памяти или флешке): `/opt/etc/php.ini` и измените следующие значения
> ```
> memory_limit = 32M
> post_max_size = 32M
> upload_max_filesize = 16M
> ```
---
##### Обновление NFQWS
```
opkg update
opkg upgrade nfqws-keenetic
opkg upgrade nfqws-keenetic-web
```
##### Удаление
```
opkg remove --autoremove nfqws-keenetic-web nfqws-keenetic
```
##### Информация об установленной версии
```
opkg info nfqws-keenetic
opkg info nfqws-keenetic-web
```

### Политики доступа на Keenetic/Netcraze

На Keenetic/Netcraze можно создать политику доступа **NFQWS** (Приоритеты подключений – Политики доступа в интернет)
и после перезапуска nfqws-keenetic будет работать только для устройств из этой политики.<br/>
_Не забудьте поставить галочку на интерфейсе провайдера в созданной политике._

Можно сделать политику исключения, добавив в конфиг `POLICY_EXCLUDE=1`. Тогда будет обрабатываться трафик для всех устройств, кроме тех, что добавлены в политику `NFQWS`.<br/>
Имя политики можно изменить в конфиге, параметр `POLICY_NAME`.

Если политика с таким именем не найдена, будет обрабатываться весь трафик.

---
### Настройки

Файл настроек расположен по пути `/opt/etc/nfqws/nfqws.conf`. Для редактирования можно воспользоваться встроенным редактором `vi` или установить `nano` или же скачать файл на ПК, отредактировать и закинуть обратно на фшлешку, предварительно остановив службу NFQWS.

```
# Интерфейс провайдера. Обычно `eth3` или `eth2.2` для проводного соединения, и `ppp0` для PPPoE
# Заполняется автоматически при установке
# Можно ввести несколько интерфейсов, например ISP_INTERFACE="eth3 nwg1"
# Для поиска интерфейса можно воспользоваться командами `route` или `ifconfig`
ISP_INTERFACE="..."

# Стратегии обработки HTTPS и QUIC трафика
NFQWS_ARGS="..."
NFQWS_ARGS_QUIC="..."

# Стратегия обработки UDP трафика (не использует параметры из NFQWS_EXTRA_ARGS)
NFQWS_ARGS_UDP="..."

# Режим работы (auto, list, all)
NFQWS_EXTRA_ARGS="..."

# IP-списки
NFQWS_ARGS_IPSET="..."

# Дополнительные стратегии
NFQWS_ARGS_CUSTOM=""

# Обрабатывать ли IPv6 соединения
IPV6_ENABLED=0|1

# TCP порты для iptables
# Оставьте пустым, если нужно отключить обработку TCP
# Добавьте порт 80 для обработки HTTP (TCP_PORTS=443,80)
TCP_PORTS=443(,80)

# UDP порты для iptables
# Оставьте пустым, если нужно отключить обработку UDP
# Удалите порт 443, если не нужно обрабатывать QUIC
UDP_PORTS=443(,50000:50099)

# Политика доступа (только для Keenetic/Netcraze)
POLICY_NAME="nfqws"

# Режим работы политики доступа
# 0 - обрабатывается трафик только для устройств в политике
# 1 - обрабатывается трафик для всех устройств, кроме добавленных в политику
POLICY_EXCLUDE=0|1

# Логирование в Syslog
LOG_LEVEL=0|1
```

Стратегии применяются ко всем доменам из `user.list` и `auto.list`, за исключением доменов из `exclude.list`.<br/>
В конфиге есть 3 варианта параметра `NFQWS_EXTRA_ARGS` - это режим работы nfqws:
- В режиме `$MODE_LIST` будут обрабатываться только домены из файла `user.list`
- В режиме `$MODE_AUTO` кроме этого будут автоматически определяться недоступные домены и добавляться в список, по которому `nfqws` обрабатывает трафик. Домен будет добавлен, если за 60 секунд будет 3 раза определено, что ресурс недоступен
- В режиме `$MODE_ALL` будет обрабатываться весь трафик кроме доменов из списка `exclude.list`

Также, есть два IP-списка: `ipset.list` и `ipset_exclude.list`.
Адреса из списков применяются в любых режимах работы.

---

### Полезное

1. Конфиг-файл `/opt/etc/nfqws/nfqws.conf`
2. Скрипт запуска/остановки `/opt/etc/init.d/S51nfqws {start|stop|restart|reload|status}`
3. Вручную добавить домены в список можно в файле `/opt/etc/nfqws/user.list` (один домен на строке, поддомены учитываются автоматически)
4. Автоматически добавленные домены `/opt/etc/nfqws/auto.list`
5. Лог автоматически добавленных доменов `/opt/var/log/nfqws.log`
6. Домены-исключения `/opt/etc/nfqws/exclude.list` (один домен на строке, поддомены учитываются автоматически)
7. IP-список для обработки `ipset.list` (на каждой строчке ip или cidr ipv4, или ipv6)
8. IP-список для исключения `ipset_exclude.list`
9. Проверить, что нужные правила добавлены в таблицу маршрутизации `iptables-save | grep "queue-num 200"`
   > Вы должны увидеть похожие строки
   > ```
   > -A POSTROUTING -o eth3 -p tcp -m tcp --dport 443 -m connbytes --connbytes 1:6 --connbytes-mode packets --connbytes-dir original -m mark ! --mark 0x40000000/0x40000000 -j NFQUEUE --queue-num 200 --queue-bypass
   > ```
### Как использовать несколько стратегий

Можно добавить дополнительные стратегии в опции `NFQWS_ARGS_CUSTOM` в конфиге и разделять их параметром `--new`.
Например, стратегия ниже применит опцию `--dpi-desync=fake,split2` для HTTPS запросов к доменам из `custom.list`,
а для HTTP запросов будет использовать `--dpi-desync=disorder2 --dpi-desync-fooling=md5sig,badseq`:
```
NFQWS_ARGS_CUSTOM="--filter-tcp=443 --dpi-desync=fake,split2 --hostlist=custom.list --new --filter-tcp=80 --dpi-desync=disorder2 --dpi-desync-fooling=md5sig,badseq"
```

### Как подобрать рабочую стратегию NFQWS

1. Запустить скрипт и следовать его инструкциям
   ```
   opkg install curl
   /bin/sh -c "$(curl -fsSL https://github.com/Anonym-tsk/nfqws-keenetic/raw/master/common/strategy.sh)"
   ```
   Подробнее можно почитать на [исходной странице](https://github.com/bol-van/zapret?tab=readme-ov-file#%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0-%D0%BF%D1%80%D0%BE%D0%B2%D0%B0%D0%B9%D0%B4%D0%B5%D1%80%D0%B0)

2. Найденную стратегию вписать в конфиге `/opt/etc/nfqws/nfqws.conf` в параметр `NFQWS_ARGS`

---
Вся инструкция взята из репозитория [Anonym-tsk](https://github.com/Anonym-tsk/nfqws-keenetic)
