# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe, erpnext
import frappe.defaults
from frappe import _
import datetime
from frappe.utils import flt
from erpnext.selling.doctype.customer.customer import get_customer_outstanding, get_credit_limit
from erpnext.accounts.utils import get_balance_on
from erpnext.accounts.doctype.sales_invoice.sales_invoice import validate_inter_company_transaction,get_inter_company_details



@frappe.whitelist()
def get_itemdata(item_code=None, item_group=None, customer=None, price_list=None, company=None, item_master_code=None, item_origin=None):
    where_cond = False
    where_clause = ""
    item_price_list = []
    if (item_code is not None and item_code != "") or (item_group is not None and item_group != "") or \
            (item_master_code is not None and item_master_code != "") or (item_origin is not None and item_origin != ""):
        if item_code is not None and item_code != "":
            where_clause = where_clause + "i.item_code='{}' and ".format(item_code)
            where_cond = True

        if item_group is not None and item_group != "":
            where_clause = where_clause + "i.item_group='{}' and ".format(item_group)
            where_cond = True

        if item_master_code is not None and item_master_code != "":
            where_clause = where_clause + "i.item_master_code='{}' and ".format(item_master_code)
            where_cond = True

        if item_origin is not None and item_origin != "":
            where_clause = where_clause + "i.supplier_origin_code='{}' and ".format(item_origin)
            where_cond = True

        where_clause = where_clause.rstrip("and ")

        if where_cond:
            where_clause = "where " + where_clause

        sql = """SELECT 
					i.item_code,
					i.item_name,
					i.description,
					i.item_group,
					COALESCE(i.sales_uom,'') as sales_uom
					FROM `tabItem` i
					{}
			""".format(where_clause)
        items = frappe.db.sql(sql, as_dict=True)

        for item in items:
            lvr = get_last_valuation_rates(item.item_code)
            last = get_last_selling_price(item_code=item.item_code, customer=customer, company=company)
            latest_item_price = frappe.get_value("Item Price",
                                                 filters={"item_code": item.item_code, "price_list": price_list},
                                                 fieldname="price_list_rate")
            latest_item_price = frappe.get_list("Item Price",
                                                 filters={
                                                     "item_code": item.item_code},
                                                 fields=["price_list_rate","price_list"], ignore_permissions=True)
            for cur_stock in last.stock_balance:
                if cur_stock.available_qty > 0:
                    for ip in latest_item_price:
                        item_price_list.append({
                            "item_code": item.item_code,
                            "item_name": item.item_name,
                            "sales_uom": item.sales_uom,
                            "description": item.description,
                            "qty": cur_stock.actual_qty,
                            "available_qty": cur_stock.available_qty,
                            "price_list": ip.price_list,
                            "rate": ip.price_list_rate or 0,
                            "warehouse": cur_stock.warehouse,
                            "valuation_rate": lvr
                        })

    return item_price_list


@frappe.whitelist()
def get_last_item_sales(item_code=None, customer=None, sales_from=None, from_date=None,
                        item_group=None, item_master_code=None, item_origin=None):
    where_cond = False
    where_clause = ""
    item_price_list = []

    if (item_code is not None and item_code != "") or (item_group is not None and item_group != "") or \
            (item_master_code is not None and item_master_code != "") or (item_origin is not None and item_origin != ""):
        if item_code is not None and item_code != "":
            where_clause = where_clause + "i.item_code='{}' and ".format(item_code)
            where_cond = True

        if item_group is not None and item_group != "":
            where_clause = where_clause + "i.item_group='{}' and ".format(item_group)
            where_cond = True

        if item_master_code is not None and item_master_code != "":
            where_clause = where_clause + "i.item_master_code='{}' and ".format(item_master_code)
            where_cond = True

        if item_origin is not None and item_origin != "":
            where_clause = where_clause + "i.supplier_origin_code='{}' and ".format(item_origin)
            where_cond = True

        where_clause = where_clause.rstrip("and ")

        if where_cond:
            where_clause = "where " + where_clause

        sql = """SELECT 
					i.item_code,
					i.item_name,
					i.description
					FROM `tabItem` i
					{}
			""".format(where_clause)

        items = frappe.db.sql(sql, as_dict=True)

        for item in items:
            last = get_last_selling_price(item.item_code, customer, sales_from, from_date)
            item_price_list += last.item_price
    return {'item_price_list': item_price_list}


@frappe.whitelist()
def get_last_selling_price(item_code='', customer='', sales_from='', from_date='', company=''):
    customer_cond = ""
    from_date_cond = ""
    if customer != '' and customer is not None:
        customer_cond = """si.customer = '{customer}' and """.format(customer=customer)
    if from_date != "" and from_date is not None:
        from datetime import datetime
        from_date_cond = """and (Date(posting_date) between '{0}' and '{1}')""".format(from_date, datetime.today().date())

    ## SALES WORK
    sales_query = """select 
                sid.item_code,
                sid.item_name,
                sid.description,
                sid.stock_uom,
                sid.qty,
                sid.rate,
                'Sale' as rate_type,
                si.posting_date,
                si.posting_time,
                sid.parent as `record_id`,
                'Sales Invoice' as doctype
            from
                `tabSales Invoice Item` sid
            inner join `tabSales Invoice` si on
                sid.parent = si.name
            where
                {customer}
                sid.item_code = '{item_code}'
                and si.docstatus != 2
                {from_date}
            
            order by
                posting_date desc, posting_time desc
            """

    last_customer_prices = frappe.db.sql(sales_query.format(
        customer=customer_cond, item_code=item_code, from_date=from_date_cond), as_dict=True)

    current_stock = frappe.db.sql(
        """select
                tb.warehouse,
                tb.actual_qty,
                tb.actual_qty as available_qty
            from
                `tabBin` tb
            left join tabWarehouse tw on
            	tb.warehouse = tw.name
            where
                tb.item_code = '{item_code}'
        """.format(item_code=item_code), as_dict=True)
    return frappe._dict({'item_price': last_customer_prices, 'stock_balance': current_stock})

def get_last_valuation_rates(item_code):
    last_rates = frappe.get_list("Stock Ledger Entry", fields=['valuation_rate'], filters={'item_code':item_code}, order_by="modified desc", page_length = 1)
    rate = ''
    if len(last_rates) > 0:
        return last_rates[0]['valuation_rate']
    return rate


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_alternative_items(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql(""" select alternative_item_code from `tabItem Alternative Nested`
            where parent = %(item_code)s and alternative_item_code like %(txt)s limit {0}, {1}
        """.format(start, page_len), {
            "item_code": filters.get('item_code'),
            "txt": '%' + txt + '%'
        })

def check_expiry(doc,handler=None):
    current_branch = doc.cost_center
    # current_branch = frappe.get_value("Branchwise Users", filters={"name": frappe.session.user}, fieldname="branch")
    customer_branch = frappe.get_value("Customer", filters={"name":doc.customer}, fieldname="cost_center")
    if current_branch != customer_branch:
        frappe.throw(_("Customer {0} belongs to different branch: {1}".format(doc.customer, customer_branch)))
    """check expire date while submit sales invoice"""
    for sales_team_member in doc.sales_team:
        # print(each)
        sales_team_members = frappe.get_list("Sales Team",
                    filters={
                        "sales_person": sales_team_member.sales_person,
                        "parent":("like","SAL-ORD-%")
                    }, 
                    fields=["parent","sales_person"])

        for sales_person in sales_team_members:
            sales_order_doc = frappe.get_doc('Sales Order', sales_person.parent)
            if sales_order_doc.docstatus == 1 and sales_order_doc.expire_date < datetime.datetime.now().date():
                frappe.throw("The sales person {sp} has an expired Sale Order {so}.Please cancel or extend it to continue"
                    .format(sp=sales_team_member.sales_person,so=sales_person.parent))

def check_order_fullfillment(doc, handler=None):
    if doc.intercompany:
        source_doc = frappe.get_doc("Sales Invoice", doc.name)
        validate_inter_company_transaction(source_doc, "Sales Invoice")
        details = get_inter_company_details(source_doc, "Sales Invoice")
        pi = frappe.new_doc("Purchase Invoice")
        pi.posting_date = source_doc.posting_date
        pi.update_stock = 1
        pi.company = details.get("company")
        pi.supplier = details.get("party")
        pi.buying_price_list = source_doc.selling_price_list
        pi.purchase_type = "Local Purchase"
        pi.credit_to = frappe.get_value("Company",details.get("company"),'default_payable_account')

        mr = frappe.get_doc("Material Request", source_doc.material_request)
        i = mr.items[0]
        pi.sales_order = i.sales_order

        pi.set_warehouse = i.warehouse

        for item in source_doc.items:
            pi.append("items", {
                "item_code": item.item_code,
                "warehouse": item.intercompany_warehouse,
                "qty": item.qty,
                "received_qty": item.qty,
                "rate": item.rate,
                "conversion_factor": 1.0,
            })

        pi.docstatus = 1
        # pi.insert() 
        pi.save(ignore_permissions=True) 
        print("PURCHASE INVOICEEEEEEEEEEEEEEEEE", pi.name)         
        # so = frappe.get_doc("Sales Order",i.sales_order)
        frappe.db.set_value("Sales Order",i.sales_order,"purchase_invoice",pi.name)

        set_permissions("Purchase Invoice", pi.name, "source company sales person")
        # set_permissions("Purchase Invoice", pi.name, "dest company MR person")    
        # so.purchase_invoice = pi
        # print("PI", so.purchase_invoice)

    """check availability of stocks"""
    for each_item in doc.items:
        if each_item.sales_order:
            freezed_item_list = frappe.db.sql("""
                select 
                    tsfil.fulfilled
                from 
                    `tabStock Freeze` tsf 
                join 
                    `tabStock Freeze Item List` tsfil 
                on
                    tsf.name = tsfil.parent 
                where 
                    tsfil.item='{item_code}' and 
                    tsf.sales_order='{sales_order}' and 
                    tsfil.warehouse='{warehouse}' and
                    tsf.company='{company}';
                """.format(item_code=each_item.item_code,
                warehouse=each_item.warehouse,
                company=doc.company, 
                sales_order=each_item.sales_order), as_dict=True)
            if freezed_item_list:
                if (freezed_item_list[0].get("fulfilled") != 1):
                    frappe.throw("Can not proceed for unfullfilled Sales Order")
        else:
            freezed_item_list = frappe.db.sql("""
                select 
                    tsfil.fulfilled
                from 
                    `tabStock Freeze` tsf 
                join 
                    `tabStock Freeze Item List` tsfil 
                on
                    tsf.name = tsfil.parent 
                where 
                    tsfil.item='{item_code}' and 
                    tsf.sales_invoice='{sales_invoice}' and 
                    tsfil.warehouse='{warehouse}' and
                    tsf.company='{company}';
                """.format(item_code=each_item.item_code,
                warehouse=each_item.warehouse,
                company=doc.company, 
                sales_invoice=doc.name), as_dict=True)
            if freezed_item_list:
                if (freezed_item_list[0].get("fulfilled") != 1):
                    frappe.throw("Can not proceed for unfullfilled Sales Invoice")


def set_permissions(doctype=None, docname=None, role=None):
    u_list = frappe.db.sql("""select
                                    parent as `user`
                                from
                                    `tabHas Role` thr
                                where
                                    role = '{role}'
                                    and parenttype = 'User'""".format(role=role), as_dict=True)
    for u in u_list:
        add_user_permission(doctype, docname, u.user, True)





@frappe.whitelist()
def get_balances(customer=None,company=None):
    c = []
    credit_limit = get_credit_limit(customer, company)
    c.append(credit_limit)
    bypass_credit_limit_check_at_sales_order = frappe.db.get_value("Customer Credit Limit",
        filters={'parent': customer, 'parenttype': 'Customer', 'company': company},
        fieldname=["bypass_credit_limit_check"])
    outstanding_amt = get_customer_outstanding(customer, company,
            ignore_outstanding_sales_order=bypass_credit_limit_check_at_sales_order)
    # c.append(outstanding_amt)
    pb = get_balance_on(party_type="Customer", party=customer)
    c.append(pb)
    bal = flt(credit_limit) - flt(outstanding_amt)
    c.append(bal)
    return c