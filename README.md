# Terraform ECS plan checker
Simple **Node.js** CLI tool that checks the generated **Terraform plan** for differences between the previous and new **container definitions** of an **ECS service**.

<p align="center">
<img src="img/verified.png">
</p>

## Why
Troubleshooting a forced resource isn't always easy and can often be something very small... Also `TF_LOG=DEBUG` is chaotic and sucks to read.

## Prerequisites
- [jq](https://stedolan.github.io/jq)
- [Node.js](https://nodejs.org/en)

## Installation
```bash
npm install plancheck -g
```

## Usage
Using the checker tool is as easy as typing `plancheck <tf-plan>`.
