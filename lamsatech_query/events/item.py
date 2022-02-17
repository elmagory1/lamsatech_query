from __future__ import unicode_literals
import frappe
from frappe import _
from datetime import date,datetime
from frappe.utils import get_url_to_form
import json

def validate_supplier_and_country_code(doc, handler=None):
	for supplier in doc.supplier_items:
		sup_doc = frappe.get_doc('Supplier', supplier.supplier)
		if sup_doc.origin_code == None or sup_doc.origin_code == None :
			frappe.throw("Supplier Origin Code is Mandatory for Supplier <a href='"+ get_url_to_form('Supplier', supplier.supplier)+"'>"+supplier.supplier+"</a>")

		if sup_doc.country == None or sup_doc.country == "":
			frappe.throw("Country Code is Mandatory for Supplier <a href='" + get_url_to_form('Supplier', supplier.supplier)+"'>"+supplier.supplier+"</a>")

def generate_item_code(doc,handler=None):
	origin = ''
	if not doc.local_purchase_item:
		existing_suppliers = frappe.get_list("Item Supplier",
												 filters={
													 "supplier": doc.supplier,
													 "parent": doc.name
												 },
												 fields=["parent", "supplier"])
		if not existing_suppliers:
			doc.append("supplier_items",{
				"supplier": doc.supplier,
				})

	# if doc.supplier_items:
		# supplier = doc.supplier_items[0]
		# sup_doc = frappe.get_doc('Supplier', supplier.supplier)
		supplier = doc.supplier
		sup_doc = frappe.get_doc('Supplier', supplier)
		country = frappe.get_doc("Country", sup_doc.country)
		# origin = country.code.upper()+sup_doc.supplier_code.upper()
		origin = doc.supplier_origin_code
		doc.country = country.name
	else:
		origin = doc.local_item_origin

	doc.item_origin = origin
	new_code = doc.item_code + doc.item_origin
	doc.item_code = new_code
	doc.name = new_code
	# doc.supplier = sup_doc.name

def after_install():
	if not frappe.db.exists("Warehouse Type", "Transit"):
		w_type = frappe.new_doc('Warehouse Type')
		w_type.name = "Transit"
		w_type.description = "Transit"
		w_type.insert(ignore_permissions=True)

	if not frappe.db.exists("Warehouse Type", "Consignment"):
		w_type = frappe.new_doc('Warehouse Type')
		w_type.name = "Consignment"
		w_type.description = "For Consignment Sales"
		w_type.insert(ignore_permissions=True)

	if not frappe.db.exists("Category Type","Special Preference"):
		c_type = frappe.new_doc('Category Type')
		c_type.name1 = "Special Preference"
		c_type.abbreviation = "Cat-S"
		c_type.insert(ignore_permissions=True)
	if not frappe.db.exists("Category Type","Value"):
		c_type = frappe.new_doc('Category Type')
		c_type.name1 = "Value"
		c_type.abbreviation = "Cat-V"
		c_type.insert(ignore_permissions=True)
	if not frappe.db.exists("Category Type","Movement"):
		c_type = frappe.new_doc('Category Type')
		c_type.name1 = "Movement"
		c_type.abbreviation = "Cat-M"
		c_type.insert(ignore_permissions=True)
	if not frappe.db.exists("Category Type","Profit"):
		c_type = frappe.new_doc('Category Type')
		c_type.name1 = "Profit"
		c_type.abbreviation = "Cat-P"
		c_type.insert(ignore_permissions=True)

@frappe.whitelist()
def onchange_master_code(master_code=None):
	if master_code:
		result = []
		doc = frappe.get_doc("Master Code", master_code)
		result.append(doc.item_group)
		result.append(doc.stock_uom)
		return result


@frappe.whitelist()
def get_related_items(item_code):
	item_doc = frappe.get_doc("Item", item_code)
	rel_item_list = []
	for rel_items in item_doc.related_item:
		current_stock = frappe.db.sql(
			"""select
					tb.warehouse,
					tb.actual_qty,
					tsa.available_quantity as available_qty
				from
					`tabBin` tb
				left join `tabStock Available` tsa on
					tsa.item = tb.item_code
				where
					tb.item_code = '{}'
					and tb.warehouse = tsa.warehouse
	            	and tb.item_code = tsa.item""".format(rel_items.item), as_dict=True)
		if len(current_stock) > 0:
			for stock in current_stock:
				item_dict = {
					'item': rel_items.item,
					'description': rel_items.description,
					'warehouse': stock.warehouse,
					'actual_qty': stock.actual_qty,
					'available_qty': stock.available_qty
				}
				rel_item_list.append(item_dict)
		else:
			item_dict = {
				'item': rel_items.item,
				'description': rel_items.description,
				'warehouse': "",
				'actual_qty': 0,
				'available_qty': 0
			}
			rel_item_list.append(item_dict)


	return rel_item_list