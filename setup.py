from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in lamsatech_query/__init__.py
from lamsatech_query import __version__ as version

setup(
	name="lamsatech_query",
	version=version,
	description="LamsaTech Item Query",
	author="Mohamed Almagory",
	author_email="info@lamsatech.com.ly",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
