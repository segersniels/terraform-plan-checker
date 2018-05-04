# Terraform ECS plan checker
[![changelog](https://img.shields.io/badge/changelog--lightgrey.svg)](CHANGELOG.md)
[![npm](https://img.shields.io/npm/dm/terraform-ecs-plan-checker.svg)](https://www.npmjs.com/package/terraform-ecs-plan-checker)

Simple CLI tool that checks the generated **Terraform plan** for differences between the previous and new **container definitions** of an **ECS service**.

<p align="center">
<img src="img/verified.svg" width="250">
</p>

## Why
Troubleshooting a forced resource on a container definition isn't always easy and can often be something very small... Also `TF_LOG=DEBUG` is chaotic and I hate reading through it.  

I needed a simple tool that let me check the container definitions real quick to have a safe check before applying. It might not be perfect but it gets the job done.

## Installation
```bash
npm install terraform-ecs-plan-checker -g
```

## Usage
Using the checker tool is as easy as typing `plancheck <tf-plan>`.

```json
- Grabbing the container definitions
    √ Grabbing successful
- Comparing the old container definitions with the new definitions
   Lines that were changed or added:
    tf-plan | (foo-bar)  "image": "000000000.dkr.ecr.eu-west-1.amazonaws.com/foo-bar:0.0.1-1"
   Lines that were deleted:
    tf-plan | (foo-bar)  "name": "FOO"
    tf-plan | (foo-bar)  "value": "BAR"
```

Or pipe your plan directly to `terraform plan |plancheck`.

It is also possible to pass the `--clean` flag to `plancheck` to output a JSON file which enables you to process the output further. The JSON only consists out of changed and new lines, not taking the deleted lines into account to keep it as basic as possible.

*(eg. implementing a check to see if new image versions are available in ECR before applying the plan).*

```json
[
    {
        "key": "image",
        "value": "000000000.dkr.ecr.eu-west-1.amazonaws.com/foo-bar:0.0.1-1"
    }
]
```

```bash
#!/usr/bin/env bash
IMAGES=($(plancheck tf-plan --clean |jq -r '.[] | select(.key == "image") | .value'))

function prompt () {
  sleep 1
  while true; do
    read -p " Continuing is not suggested, do you want to continue? [y/n] " yn
    case $yn in
      [Nn]* ) exit 1; break;;
      [Yy]* ) exit;;
      * ) echo "Please answer yes or no.";;
    esac
  done
}

for image in "${IMAGES[@]}"
do
  service=${image##*/}
  name=${service%%:*}
  version=${service##*:}
  ecr=$(aws ecr list-images --repository-name $name 2>/dev/null)

  if [ -z "$ecr" ]; then
    echo "ERR: Repository '$name' not found"
    prompt
  else
    if [[ $ecr == *"$version"* ]]; then
      echo "SUCCESS: version: '$version' exists in ECR repository '$name'"
    else
      echo "ERR: version: '$version' is not in ECR repository '$name'"
      exit 1
    fi
  fi
done
```

## Similar projects
- https://github.com/coinbase/terraform-landscape  
> A nice extensive tool that actualy compares the entire plan to it's previous state, not limiting it to ECS plans. The problem with landscape is that it doesn't take line position into account when comparing `container_definitions` and thus showing unneeded changes making it rather hard to see what was changed.
