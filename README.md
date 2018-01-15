# Terraform plan checker
Simple tool that checks the generated Terraform plan for differences between the previous and new container definitions of an ECS service.

# Why
Troubleshooting a forced resource isn't always easy and can often be something very small... Also `TF_LOG=DEBUG` is chaotic and sucks to read.

# Installation
Clone the repo and: `npm install -g`

# Usage
Using the checker tool is as easy as typing `plancheck <tf-plan>`.
