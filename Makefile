#
# Copyright (C) 2025
#
# This is free software, licensed under the Apache License, Version 2.0
#
# Simplified Makefile for APK/IPK compatibility
# Thanks to @smalleaves for the suggestion (GitHub issue #8)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-proton2025
PKG_RELEASE:=1

LUCI_TITLE:=Proton2025 - Elegant Dark Theme for LuCI
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

PKG_LICENSE:=Apache-2.0

include $(TOPDIR)/feeds/luci/luci.mk

$(eval $(call BuildPackage,$(PKG_NAME)))
