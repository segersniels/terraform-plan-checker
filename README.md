# Terraform ECS plan checker
Simple **Node.js** CLI tool that checks the generated **Terraform plan** for differences between the previous and new **container definitions** of an **ECS service**.

<p align="center">
<img src="img/verified.png">
</p>

## Why
Troubleshooting a forced resource on a container definition isn't always easy and can often be something very small... Also `TF_LOG=DEBUG` is chaotic and I hate reading through it.  

I needed a simple tool that let me check the container definitions real quick to have a safe check before applying.

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

for image in "${IMAGES[@]}"
do
  service=${image##*/}
  name=${service%%:*}
  version=${service##*:}
  ecr=$(aws ecr list-images --repository-name $name)

  if [[ $ecr == *"$version"* ]]; then
    echo "SUCCESS: version: '$version' exists in ECR repository '$name'"
  else
    echo "ERR: version: '$version' is not in ECR repository '$name'"
    exit 1
  fi
done
```

## How it works
`plancheck` attempts to extract the old container definitions and new ones directly from the output generated by `terraform show <plan>`. After extracting these definitions get transformed to valid JSON objects.

Then these human readable JSON objects get transformed into arrays that get compared line by line. This is done to prevent changes being detected when line positions change resulting in cluttered results.

The rest is pretty simple, whenever a line is in the new definition and not in the old one it gets shown as a changed line. 

Deleted lines work the other way around. A string similarity check here prevents values from being printed as a deleted line when they have already been shown as a changed line (*eg. renamed environment variable*).

## Similar projects
- https://github.com/coinbase/terraform-landscape  
> A nice extensive tool that actualy compares the entire plan to it's previous state, not limiting it to ECS plans.  
The problem with landscape was that it didn't take line position into account when comparing `container_definitions` and thus showed me unneeded changes making it rather hard to see what I changed.
