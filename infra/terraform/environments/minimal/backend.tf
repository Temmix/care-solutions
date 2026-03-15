terraform {
  backend "s3" {
    bucket         = "care-solutions-terraform-state"
    key            = "minimal/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "care-solutions-terraform-lock"
    encrypt        = true
  }
}
