1.3.4 / 2018-05-03
==================

  * bump version
  * show all command changes not only unique
  * adjust added lines to show command changes

1.3.3-rc.2 / 2018-05-03
=======================

  * bump version
  * only try to replace when not undefined

1.3.3-rc.1 / 2018-05-02
=======================

  * dont show error when clean

1.3.3 / 2018-05-02
==================

  * version bump
  * add several security and error checks

1.3.2-rc.1 / 2018-05-02
=======================

  * readme update pipe

1.3.2 / 2018-05-02
==================

  * allow user to pipe terraform plan show to stdin
  * version

1.3.0-rc.1 / 2018-05-02
=======================

  * version

1.3.1-rc.1 / 2018-05-02
=======================

  * correctly iterate over services when grabbing definitions
  * remove unused line
  * update bash script

1.3.0 / 2018-04-30
==================

  * set width for img
  * readd image
  * better selection of old and new definitions

1.2.8 / 2018-03-26
==================

  * fixed new services not being shown correctly
  * name change

1.2.7 / 2018-03-14
==================

  * fix deleted lines not showing if deleted lines are the only change
  * removed how it works from readme ; pretty straight forward actually

1.2.6 / 2018-03-02
==================

  * fix similarity check when undefined

1.2.5 / 2018-03-02
==================

  * version 1.2.5
  * lowered the similarity string check value between service names ; might increase it again
  * version 1.2.4

1.2.4 / 2018-03-01
==================

  * ugly code
  * prevent cluttered output on entirely new service being shown in deleted lines

1.2.3 / 2018-02-23
==================

  * readme

1.2.2 / 2018-02-23
==================

  * check for similarity between lines not values

1.2.1 / 2018-02-23
==================

  * readme

1.2.0 / 2018-02-23
==================

  * show the no difference line when no difference is detected
  * version 1.2.0
  * readme updated
  * check for string similarity to deterimine if similar instead of hard comparing
  * init
  * trim output

1.1.3 / 2018-02-20
==================

  * semicolon missing ; added --clean flag example to readme

1.1.2 / 2018-02-19
==================

  * added --clean option to output an array to further use in scripts
  * formatting console output
  * remove unneeded console.log

1.1.1 / 2018-02-09
==================

  * added /usr/bin/env node

1.1.0 / 2018-02-09
==================

  * removed jq dependency
  * package.json

1.0.8 / 2018-02-01
==================

  * added output example
  * added jq remove readme

1.0.7 / 2018-02-01
==================

  * added similar projects to readme

1.0.6 / 2018-02-01
==================

  * added similar projects to readme

1.0.5 / 2018-02-01
==================

  * now check against variable instead of creating unneeded file

1.0.3 / 2018-02-01
==================

  * poiting to correct lib location

1.0.2 / 2018-02-01
==================

  * update readme install
  * update package.json

1.0.1 / 2018-02-01
==================

  * update installation
  * update
  * small changes, please dont break too many things
  * bold text readme
  * remove check file when err
  * extended parameter usage from node to bash bin
  * readme updated
  * now uses a combination of bash, jq and nodejs to calculate differences
  * readme
  * added colors to changed lines
  * duplicate code removal of type old or new
  * adjusted some code and throwing error when given plan doesnt exist
  * adjusted readme
  * removed json-diff dependency and wrote own comparison tool
  * added tf-plan file usage
  * init
