# Terraform ECS plan checker
Simple **Node.js** CLI tool that checks the generated **Terraform plan** for differences between the previous and new **container definitions** of an **ECS service**.

<p align="center">
<img src="img/verified.png">
</p>

## Why
Troubleshooting a forced resource on a container definition isn't always easy and can often be something very small... Also `TF_LOG=DEBUG` is chaotic and I hate reading through it.  

I needed a simple tool that let me check the container definitions real quick to have a safe check before applying.

## Prerequisites
- [jq](https://stedolan.github.io/jq)
- [Node.js](https://nodejs.org/en)

## Installation
```bash
npm install terraform-ecs-plan-checker -g
```

## Usage
Using the checker tool is as easy as typing `plancheck <tf-plan>`.

## Similar projects
- https://github.com/coinbase/terraform-landscape  
> A nice extensive tool that actualy compares the entire plan to it's previous state, not limiting it to ECS plans.  
The problem with landscape was that it didn't take line position into account when comparing `container_definitions` and thus showed me unneeded changes making it rather hard to see what I changed.
