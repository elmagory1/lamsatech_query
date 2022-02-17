import frappe

@frappe.whitelist()
def get_warehouse_list(item_code):
    warehouse_list = frappe.db.get_list('Bin',
        filters={
            'item_code': item_code,
            'actual_qty': ['>', 0]
        },
        fields=['warehouse']
    )

    warehouse_array = []
    for el in warehouse_list:
        warehouse_array.append(el.warehouse)

    return warehouse_array


@frappe.whitelist()
def get_uoms(item=None):
    return frappe.db.sql("""select uom.uom
		from `tabUOM Conversion Detail` uom
		where
			uom.parent = {item_code}"""
                         .format(item_code=frappe.db.escape(item))
                                 , as_dict=True)


@frappe.whitelist()
def get_uoms_rel_item(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select uom.uom
		from `tabUOM Conversion Detail` uom
		where
			uom.parent = {item_code}"""
                         .format(item_code=frappe.db.escape(filters.get("item"))
                                 ))