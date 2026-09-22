import sys

def patch_controller(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    old_import = """import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';"""
    new_import = """import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';"""
    content = content.replace(old_import, new_import)

    old_param = """async getDetail(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {"""
    new_param = """async getDetail(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {"""
    content = content.replace(old_param, new_param)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_controller(sys.argv[1])
