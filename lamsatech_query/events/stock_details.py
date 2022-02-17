import frappe
from erpnext.stock.utils import get_latest_stock_qty


@frappe.whitelist()
def get_last_selling_price_of_customer(item_code='', customer=''):
    last_customer_price = frappe.db.sql(
        """select rate,posting_date from `tabSales Invoice Item` sid inner join `tabSales Invoice` si on sid.parent= si.name where si.customer = '{}' and sid.item_code = '{}' and si.docstatus != 2 order by si.posting_date DESC""".format(
            customer, item_code))
    if last_customer_price:
        last_customer_price = last_customer_price[0][0]
    else:
        last_customer_price = "First Sale"

    current_stock = get_latest_stock_qty(item_code)
    return {'item_price': last_customer_price, 'current_stock': current_stock}


@frappe.whitelist()
def get_last_selling_price_of_supplier(item_code='', customer=''):
    last_customer_price = frappe.db.sql(
        """select rate,posting_date from `tabPurchase Invoice Item` sid inner join `tabPurchase Invoice` si on sid.parent= si.name where si.supplier = '{}' and sid.item_code = '{}' and si.docstatus != 2 order by si.posting_date DESC""".format(
            customer, item_code))
    if last_customer_price:
        last_customer_price = last_customer_price[0][0]
    else:
        last_customer_price = "First Sale"

    current_stock = get_latest_stock_qty(item_code)
    return {'item_price': last_customer_price, 'current_stock': current_stock}


@frappe.whitelist()
def get_last_selling_prices_of_customer_delivery(item_code='', customer=''):
    last_customer_prices = frappe.db.sql(
        """select rate,posting_date from `tabDelivery Note Item` sid inner join `tabDelivery Note` si on sid.parent= si.name where si.customer = '{}' and sid.item_code = '{}' and si.docstatus != 2 order by si.posting_date DESC limit 5""".format(
            customer, item_code))
    if last_customer_prices:
        last_customer_price = last_customer_prices
    else:
        last_customer_price = [0, '']

    current_stock = get_latest_stock_qty(item_code)
    return {'item_price': last_customer_price, 'current_stock': current_stock}


@frappe.whitelist()
def get_last_selling_prices_of_customer(item_code='', customer='', company=''):
    last_purchase_price = frappe.db.sql(
        """select rate,posting_date,si.supplier from `tabPurchase Invoice Item` sid inner join `tabPurchase Invoice` si on sid.parent= si.name where sid.item_code = '{}' and si.docstatus != 2 and si.company = '{}' order by si.posting_date DESC limit 3""".format(
            item_code, company))

    last_customer_prices = frappe.db.sql(
        """select rate,posting_date,si.customer from `tabSales Invoice Item` sid inner join `tabSales Invoice` si on sid.parent= si.name where si.customer != '{}' and sid.item_code = '{}' and si.docstatus != 2 and si.company = '{}' order by si.posting_date DESC limit 3""".format(
            customer, item_code, company))

    last_customer_prices_customer = frappe.db.sql(
        """select rate,posting_date,si.customer from `tabSales Invoice Item` sid inner join `tabSales Invoice` si on sid.parent= si.name where si.customer = '{}' and sid.item_code = '{}' and si.docstatus != 2 and si.company = '{}' order by si.posting_date DESC limit 3""".format(
            customer, item_code, company))

    last_selling = last_customer_prices_customer + last_customer_prices

    if last_selling:
        last_customer_price = last_selling
    else:
        last_customer_price = [0, '']

    current_stock = frappe.db.sql(
        """
        select
            tb.warehouse,
            tb.actual_qty,
	        tb.actual_qty as available_qty
        from
            `tabBin` tb
        where
            tb.item_code = '{item_code}'
        """.format(item_code=item_code, company=company), as_dict=True)
    return {'item_price': last_customer_price, 'purchase_rate': last_purchase_price, 'stock_balance': current_stock}


@frappe.whitelist()
def get_last_selling_price(item_code='', customer=''):
    customer_cond = ""
    if customer != '' and customer is not None:
        customer_cond = """si.customer = '{customer}' and """.format(
            customer=customer)

    last_customer_prices = frappe.db.sql(
        """select
                sid.item_code,
                sid.item_name,
                sid.description,
                sid.stock_uom,
                sid.rate,
                sid.qty,
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
            
            order by
                posting_date desc ,posting_time desc
            limit 5""".format(
            customer=customer_cond, item_code=item_code), as_dict=True)

    last_purchase_prices = frappe.db.sql("""
        select
            pid.item_code,
            pid.item_name,
            pid.description,
            pid.stock_uom,
            pid.qty,
            pid.rate,
            'Purchase' as rate_type,
            pi.posting_date,
            pi.posting_time,
            pid.parent as `record_id`,
            'Purchase Invoice' as doctype
        from
            `tabPurchase Invoice Item` pid
        inner join `tabPurchase Invoice` pi on
            pid.parent = pi.name
        where
            pid.item_code = '{item_code}'
            and pi.docstatus != 2
        order by
            posting_date desc ,posting_time desc
        limit 5""".format(item_code=item_code), as_dict=True)

    current_stock = frappe.db.sql(
        """select warehouse,actual_qty from `tabBin` where item_code = '{}'""".format(item_code), as_dict=True)
    return frappe._dict({'item_price': last_customer_prices, 'stock_balance': current_stock, 'purchase_price': last_purchase_prices})


def get_last_valuation_rates(item_code):
    last_rates = frappe.get_list("Stock Ledger Entry", fields=['valuation_rate'], filters={
                                 'item_code': item_code}, order_by="modified desc", page_length=1)
    rate = ''
    if len(last_rates) > 0:
        return last_rates[0]['valuation_rate']
    return rate