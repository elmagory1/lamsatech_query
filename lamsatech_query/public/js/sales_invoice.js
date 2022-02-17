frappe.ui.form.on('Sales Invoice', {
    setup: function(frm){
        // filter uom only for the related item
        if (frm.fields_dict["items"].grid.get_field('uom')) {
            frm.set_query("uom", "items", function(frm, cdt, cdn) {
                let item = locals[cdt][cdn];
                return {
                    query: "lamsatech_query.utils.queries.get_uoms_rel_item",
                    filters: {
                        "item": item.item_code
                    }
                }
            });
        }
    },

    onload: function(frm) {
        if(cur_frm.doc.__islocal){
            frm.events.get_user_default_branch(frm)
        }

        $(".frappe-control[data-fieldname='items'] .grid-add-multiple-rows").on('click', () => {
            let interval = setInterval(() => {
                $('.modal-dialog').hide();
                if (cur_dialog){
                    let item_codes = $('.link-select-row .col-xs-4');
                    for (let item of item_codes) {
                        item.classList.remove('col-xs-4')
                        item.classList.add('col-xs-9')
                        item.parentElement.classList.add('modified_item');
                    }
                    let items = $('.link-select-row .col-xs-8');
                    for (let item of items) {
                        item.classList.remove('col-xs-8')
                        item.classList.add('col-xs-3')
                        item.innerText = item.innerText.split(',')[0];
                    }
                    $('.modal-dialog').show();
                    cur_frm.events.modify_more_items();
                    cur_frm.events.modify_search_items();
                    setTimeout(()=> {
                        clearInterval(interval);
                    },1000)
                }
            }, 1); // check every 1ms
        });  
    },  

    refresh: function(frm){
      
        frm.get_field('items').grid.add_custom_button('Product Query', () => frm.events.search(frm));

        $("button:contains('Product Query')").addClass('btn-primary')
        $("button:contains('Alternate Item')").addClass('btn-primary')

        $('.frappe-control[data-fieldname="items"] .grid-add-multiple-rows').on('click',function(){
            var checkExist = setInterval(function() {
                if (!is_null(cur_dialog)) {
                    cur_dialog.$wrapper.find('.modal-dialog').animate({width: '90%'},100);
                    clearInterval(checkExist);
                }
            }, 100); // check every 100ms
        })

        $(document).on('click', ".frappe-control[data-fieldname='items'] .frappe-control[data-fieldname='item_code'] li:last-child", () => {
            var checkExist = setInterval(function() {
               if (!is_null(cur_dialog)) {
                  cur_dialog.$wrapper.find('.modal-dialog').animate({width: '90%'},100);
                  clearInterval(checkExist);
               }
            }, 100); // check every 100ms
        })


    },    
    search: function(frm){
        var last_searched_item = null;
        var last_searched_item_master_code = null;
        var last_searched_item_group = null;
        var last_searched_origin_code = null;
        var d = new frappe.ui.Dialog({
            'title': 'Item List',
            'fields': [
                {
                    'label': 'Filters',
                    'fieldname': 'filters_sec',
                    'fieldtype': 'Section Break'
                },
                {
                    'label': 'Item Search',
                    'fieldname': 'search_item_code',
                    'fieldtype': 'Link',
                    'options': 'Item',
                    'change': () => {
                        let cur_item_code = d.get_value('search_item_code');
                        if(cur_item_code != last_searched_item){
                            last_searched_item = cur_item_code;
                            frm.events.filtered_items(frm, d);
                        }
                    }
                },
                {
                    'fieldname': 'search_col_br',
                    'fieldtype': 'Column Break'
                },
                {
                    'label': 'Item Group',
                    'fieldname': 'search_item_group',
                    'fieldtype': 'Link',
                    'options': 'Item Group',
                    'change': () => {
                        debugger;
                        let cur_item_group = d.get_value('search_item_group');
                        if(cur_item_group != last_searched_item_group){
                            last_searched_item_group = cur_item_group;
                            frm.events.filtered_items(frm, d);
                        }
                    }
                },
                {
                    'fieldname': 'search_col_br_2',
                    'fieldtype': 'Column Break'
                },
                {
                    'label': 'From Date',
                    'fieldname': 'from_date',
                    'fieldtype': 'Date',
                    'change': () => {
                        frm.events.filtered_items(frm, d);
                    }
                },
                {
                    'label': 'Result',
                    'fieldname': 'result_sec',
                    'fieldtype': 'Section Break'
                },
                {
                    'label': 'History',
                    'fieldname': 'dialog_history',
                    'fieldtype': 'HTML'
                },
                {
                    'label': '',
                    'fieldname': 'history_sec',
                    'fieldtype': 'Section Break'
                },
                {
                    'label': 'Result',
                    'fieldname': 'dialog_filtered_items',
                    'fieldtype': 'HTML'
                },
            ],
            primary_action: function (data) {
                d.hide();


            }
        });

        d.$wrapper.find('button[data-fieldname=fetch]').removeClass('btn-default btn-xs')
        d.$wrapper.find('button[data-fieldname=fetch]').addClass('btn-primary btn-sm')
        d.$wrapper.find('div[data-fieldname="fetch"]').attr('style',"margin-top:9% !important;")
        d.$wrapper.find('button[data-fieldname="set_items"]').removeClass('btn-default btn-xs')
        d.$wrapper.find('button[data-fieldname="set_items"]').addClass('btn-primary btn-sm')
        d.$wrapper.find('.modal-dialog').css("width", "90%");
        d.$wrapper.find('.modal-dialog').css("max-width", "none");
        d.show();

        frm.events.dialog_advance_search_resize(d);

        // history tab section
        let history_tabs_template = `
        <div class="container">
            <div class="row"> <! --NEW ROW START -->

                <!-- STOCK GRID -->
                <div id="stock" class="col-md-12">
                    <h3>Stock Details</h3>
                    <div id="stock_tab_content">
                        <table class="table table-condensed table-hover table-bordered">
                            <thead class="thead-light">
                                <tr>
                                    <th><b>Item Code</b></th>
                                    <th><b>Unit</b></th>
                                    <th><b>Quantity</b></th>
                                    <th style="width: 15%;"><b>Average Cost Price</b></th>
                                    <th><b>Price List</b></th>
                                    <th style="width: 10%;"><b>Base Rate</b></th>
                                    <th style="width: 15%;"><b>Selling Price</b></th>
                                    <th><b>Warehouse</b></th>
                                    <th style="width: 15%;"><b>Expected Quantity</b></th>
                                </tr>
                            </thead>
                            <tbody id="st_body">
                                <tr> <td colspan='7'>No Record</td> </tr>
                             </tbody>
                        </table>
                        <div class="control-input" style="display: block;"><button class="btn btn-primary btn-sm" data-fieldtype="Button" data-fieldname="set_items" placeholder="" value="">Set Items</button></div>
                    </div>
                </div>



            </div> <!-- NEW ROW END -->

            <div class="row"> <! --NEW ROW START -->

                <!-- SALES GRID -->
                <div id="sales" class="col-md-12">
                    <h3>Sales History</h3>
                    <div id="sales_tab_content">
                        <div style="width:100%">
                            <table id="sales_table" class="table table-condensed table-hover table-bordered">
                                <thead class="thead-light">
                                    <tr>
                                        <th><b>Invoice No</b></th>
                                        <th><b>Posting Date</b></th>
                                        <th><b>Unit</b></th>
                                        <th><b>Qty</b></th>
                                        <th><b>Price</b></th>
                                    </tr>
                                </thead>
                                <tbody id="s_body">
                                    <tr> <td colspan='7'>No Record</td> </tr>
                                </tbody>
                            </table>
                            <!--<div style="text-align: center;">
                                <div id="nav_sales_table" class="pagination_table"></div>
                            </div>
                            <div id="nav_sales_table" class="cdp" actpage="1"></div>-->
                        </div>
                    </div>
                </div>


            </div> <!-- NEW ROW END -->

        </div>`;

        d.set_value("dialog_history", history_tabs_template)

        $('button[data-fieldname="set_items"]').attr('style',"margin-top:9% !important;")

        // SET CUSTOMER INFORMATION
        // frm.events.set_customer_details(frm, d);

        // SET ITEMS INTO ITEM GRID
        frm.events.set_items_into_grid(frm, d);

    },

    get_uom_conversion: function(frm, item_code, uom){
        let conversion_factor = {"conversion_factor": 1.0}
        frm.call({
				method: "erpnext.stock.get_item_details.get_conversion_factor",
				args: {
					item_code: item_code,
					uom: uom
				},
				async: false,
				callback: function(r) {
					if(!r.exc) {
						conversion_factor = r.message;
					}
				}
			});
        return conversion_factor;
    },

    filtered_items: function(frm, d){
        // ITEM SALES HISTORY
        frappe.call({
            method: "lamsatech_query.events.sales_invoice.get_last_item_sales",
            args:{
                "brand":d.get_value('search_brand'),
                "item_code":d.get_value('search_item_code'),
                "item_group":d.get_value('search_item_group'),
                "item_master_code": d.get_value('search_item_master_code'),
                "item_origin": d.get_value('search_origin_code'),
                "customer": frm.doc.customer,
                "sales_from": d.get_value('sales_from'),
                "from_date": d.get_value('from_date')
            },
            async:false,
            callback: function(r) {
                let rows= ``;
                if(r.message.item_price_list && r.message.item_price_list.length > 0){
                    $.each(r.message.item_price_list, function(k,v){
                        rows+= `<tr>
                            <td><a target='_blank' href='`+frappe.utils.get_form_link(v["doctype"], v["record_id"])+`'>`+v["record_id"]+`</a></td>
                            <td>`+v['posting_date']+`</td>
                            <td>`+v["stock_uom"]+`</td>
                            <td>`+v['qty']+`</td>
                            <td>`+v['rate']+`</td>
                        </tr>`

                    })
                }else{
                    rows = `<tr> <td colspan='7'>No Record</td> </tr>`;
                }

                var template = rows;

                $(d.parent).find('#s_body').html(template)
            }
        })

        // ITEM STOCK DETAILS
        frappe.call({
            method:"lamsatech_query.events.sales_invoice.get_itemdata",
            args:{
                "brand":d.get_value('search_brand'),
                "item_code":d.get_value('search_item_code'),
                "item_group":d.get_value('search_item_group'),
                "item_master_code": d.get_value('search_item_master_code'),
                "item_origin": d.get_value('search_origin_code'),
                "customer": frm.doc.customer,
                "price_list": frm.doc.selling_price_list,
                "company": frm.doc.company
            },
            async:false,
            callback: function(r) {
                let itemlist = r.message


                let filtered_item_body = ``;
                $.each(r.message,function(k,v){
                    let options = ``;
                    let uom_selectbox = '';
                    frappe.call({
                        method: "lamsatech_query.utils.queries.get_uoms",
                        args: {
                            "item": v["item_code"]
                        },
                        async: false,
                        callback: function(r){
                            if(r.message){
                                let uoms = r.message
                                if(uoms.length > 0){
                                    if(uoms.length > 1){
                                        $.each(uoms, function(key,val){
                                            if(val.uom == v["sales_uom"]){
                                                options += `<option selected>`+val.uom+`</option>`
                                            }else{
                                                options += `<option>`+val.uom+`</option>`
                                            }
                                        })
                                        uom_selectbox = `<select class='req_uom'>`+options+`</select>`;
                                    }
                                    else{
                                        uom_selectbox = `<span class="req_uom">`+uoms[0].uom+`</span>`;
                                    }
                                }


                            }

                        }
                    })



                    filtered_item_body += `
                        <tr class="item_row" data-itemcode='`+v["item_code"]+`' data-itemname='`+v["item_name"]+`'
                                data-qty='`+v["qty"]+`'
                                data-rate='`+v["rate"]+`' data-warehouse='`+v["warehouse"]+`'
                                data-uom='`+v["sales_uom"]+`' data-description='`+v["description"]+`' >

                            <td>`+v["item_code"]+`</td>
                            <td>`+uom_selectbox+`</td>
                            <td class="item_uom_qty">`+v['qty']+`</td>
                            <td>`+v['valuation_rate']+`</td>
                            <td>`+ v['price_list']+`</td>
                            <td>`+v['rate']+`</td>
                            <td><input type="number" class='rate' style="width: 100%;" ></td>
                            <td>`+v['warehouse']+`</td>
                            <td><input type="number" class='ex_qty' style="width: 100%;"></td>
                        </tr>`
                })

                let filtered_item_html = filtered_item_body;
                $(d.parent).find('#st_body').html(filtered_item_html)
            }
        });

        frm.events.calc_uom_values(frm, d) // event on change of uom selectbox

    },

    set_customer_details: function(frm, d){
        frappe.call({
			method: "lamsatech_query.events.generic.get_customer_info",
			args:{
				customer : frm.doc.customer
			},
			callback: function(r) {
                if(!r.exc) {
                    d.set_value('search_customer', frm.doc.customer)
                    d.set_value('search_customer_name', r.message[0])
                    d.set_value('search_credit_limit',r.message[1])
                    d.set_value('search_collect_within_days',r.message[2])
                }
			}
		})
    },

    set_items_into_grid: function(frm, d){
        $(d.parent).on('click','button[data-fieldname="set_items"]', function(e){
            e.preventDefault();
            let items = $(d.parent).find('.item_row')
            let item_row_name = {}
            let item_row_warehouse = {}
            $.each(items,function(k,v){
                let val = $(v).data()
                let ex_qty = $(v).find('.ex_qty').val()
                let rate = $(v).find('.rate').val()
                let req_uom = "";
                let uom_element = $(v).find('.req_uom');
                if(uom_element.is('select')){
                     req_uom = $(v).find('.req_uom').val()
                }
                else if(uom_element.is('span')){
                    req_uom = $(v).find('.req_uom').text()
                }

                if(parseFloat(ex_qty) > 0 && parseFloat(ex_qty) != null){

                    // CHECK IF FIRST ROW OF GRID IS EMPTY
                    if (frm.doc.items.length == 1){
                        if(typeof(frm.doc.items[0].item_code) == 'undefined') {
                            frm.doc.items = [];
                        }
			        }

                    let row = null
                    frappe.run_serially([
                        () => {
                            row = cur_frm.fields_dict.items.grid.add_new_row();
                        },
                        () => frappe.timeout(0.1),
                        () => frappe.model.set_value(row.doctype, row.name, "item_code", val.itemcode),
                        () => {
                            item_row_warehouse[row.name] = val.warehouse
                            item_row_name[row.name] = rate
                        },
                        () => frappe.model.set_value(row.doctype, row.name, "description", val.description),
                        () => frappe.model.set_value(row.doctype, row.name, "qty", ex_qty),
                        () => frappe.timeout(0.5),
                        () => frappe.model.set_value(row.doctype, row.name, "uom", req_uom),
                        () => frappe.timeout(0.5),
                        () => frappe.model.set_value(row.doctype, row.name, "rate", rate),
                        () => frappe.model.set_value(row.doctype, row.name, "warehouse", val.warehouse),
                        () => frappe.show_alert(__("Added {0} ({1})", [val.itemcode, ex_qty])),
                        () => frappe.timeout(0.8),
                        () => frappe.model.set_value(row.doctype, row.name, "warehouse", val.warehouse)
                    ]);

                }

            })

        });


    },

    calc_uom_values: function(frm, d){
       $(d.parent).find('.req_uom').on('change', function(e){
            let cur_uom_element = $(e.target)
            if(cur_uom_element.hasClass('req_uom')){
                let cur_uom_val = cur_uom_element.val()
                let cur_item_row = cur_uom_element.parents('.item_row')
                let cur_item_row_data = cur_item_row.data()
                let cf = frm.events.get_uom_conversion(frm,cur_item_row_data.itemcode,cur_uom_val)
                let new_qty = cur_item_row_data.qty / cf.conversion_factor
                cur_item_row.find('.item_uom_qty').html(new_qty);
            }

        })

    },

    pagination: function(d, element_id){
        $(document).ready(function(){
//            $('#'+element_id).after('<div id="nav_'+element_id+'"></div>');
            var rowsShown = 5;
            var rowsTotal = $(d.parent).find('#'+element_id+' tbody tr').length;
            var numPages = rowsTotal/rowsShown;
            var nav_html = ""
            for(var i = 0;i < numPages;i++) {
                var pageNum = i + 1;
                nav_html += '<a href="#" rel="'+i+'">'+pageNum+'</a> '
            }
            $(d.parent).find('#nav_'+element_id).html(nav_html);
            $(d.parent).find('#'+element_id+' tbody tr').hide();
            $(d.parent).find('#'+element_id+' tbody tr').slice(0, rowsShown).show();
            $(d.parent).find('#nav_'+element_id+' a:first').addClass('active');
            $(d.parent).find('#nav_'+element_id+' a').bind('click', function(e){
                e.preventDefault();
                $(d.parent).find('#nav_'+element_id+' a').removeClass('active');
                $(this).addClass('active');
                var currPage = $(this).attr('rel');
                var startItem = currPage * rowsShown;
                var endItem = startItem + rowsShown;
                $(d.parent).find('#'+element_id+' tbody tr').css('opacity','0.0').hide().slice(startItem, endItem).
                css('display','table-row').animate({opacity:1}, 300);
            });
        });
    },
    pagination_beta: function(d, element_id){
        /*
        this javascript is only to change the "actpage" attribut on the .cdp div
        */
        var rowsShown = 5;
        var rowsTotal = $(d.parent).find('#'+element_id+' tbody tr').length;
        var numPages = rowsTotal/rowsShown;
        var nav_html = '<a href="#!-1" id="prev_'+element_id+'" class="cdp_i">prev</a>'
        for(var i = 0;i < numPages;i++) {

            var pageNum = i + 1;
            nav_html += '<a href="#!'+pageNum+'" rel="'+i+'" class="cdp_i">'+pageNum+'</a>'
        }
        nav_html += '<a href="#!+1" id="next_'+element_id+'" rel="1" class="cdp_i">next</a>';
        $(d.parent).find('#nav_'+element_id).html(nav_html);
        $(d.parent).find('#'+element_id+' tbody tr').hide();
        $(d.parent).find('#'+element_id+' tbody tr').slice(0, rowsShown).show();

        var paginationPage = parseInt($(d.parent).find('#nav_'+element_id).attr('actpage'), 10);
        $(d.parent).find('#nav_'+element_id+' a').on('click', function(e){
            e.preventDefault();
            var go = $(this).attr('href').replace('#!', '');
            var currPage = $(this).attr('rel');
//            var currPage = paginationPage;
            if (go === '+1') {
                paginationPage++;
            } else if (go === '-1') {
                paginationPage--;
            }else{
                paginationPage = parseInt(go, 10);
            }
            $(d.parent).find('#nav_'+element_id).attr('actpage', paginationPage);
            $(d.parent).find('#next_'+element_id).attr('rel',parseInt(currPage) + 1)
            $(d.parent).find('#prev_'+element_id).attr('rel',parseInt(currPage) - 1)

            var startItem = currPage * rowsShown;
            var endItem = startItem + rowsShown;
            $(d.parent).find('#'+element_id+' tbody tr').css('opacity','0.0').hide().slice(startItem, endItem).
            css('display','table-row').animate({opacity:1}, 300);
        });

    },

    dialog_advance_search_resize: function(d){
        $(d.parent).on('click', ".frappe-control[data-fieldname='search_item_code'] li:last-child", () => {
            let interval = setInterval(() => {
                if (cur_dialog.title == 'Select Item') {
                    cur_dialog.$wrapper.hide();

                    let item_codes = $('.link-select-row .col-xs-4');
                    for (let item of item_codes) {
                        item.classList.remove('col-xs-4')
                        item.classList.add('col-xs-9')
                        item.parentElement.classList.add('modified_item');
                    }
                    let items = $('.link-select-row .col-xs-8');
                    for (let item of items) {
                        item.classList.remove('col-xs-8')
                        item.classList.add('col-xs-3')
                        item.innerText = item.innerText.split(',')[0];
                    }
                    cur_dialog.$wrapper.show();
                    cur_dialog.$wrapper.find('.modal-dialog').animate({ width: '90%' }, 100);
                    cur_frm.events.modify_search_items();
                    cur_frm.events.modify_more_items();
                    clearInterval(interval);
                }
            }, 1); // check every 1ms
        });

    },

    modify_more_items: function(){
        $(cur_dialog.parent).find('button[data-fieldname="more"]').on('click', (e) => {
            let interval = setInterval(() => {
                let new_items = $('.link-select-row:not(.modified_item)')
                if(new_items){
                    new_items.hide();
                    let item_codes = new_items.find('.col-xs-4');
                    let items = new_items.find('.col-xs-8');
                    for (let item of item_codes) {
                        item.classList.remove('col-xs-4')
                        item.classList.add('col-xs-9')
                        item.parentElement.classList.add('modified_item');
                    }
    
                    for (let item of items) {
                        item.classList.remove('col-xs-8')
                        item.classList.add('col-xs-3')
                        item.innerText = item.innerText.split(',')[0];
                    }
                    new_items.show();
                    setTimeout(()=> {
                        clearInterval(interval);
                    },1000)
                }
            }, 0.5);
    
        })
    },

    modify_search_items: function(){
        $(".modal-dialog .btn-primary").on('click', () => {
            let interval = setInterval(() => {
                let new_items = $('.link-select-row:not(.modified_item)')
                if(new_items){
                    new_items.hide();
                    let item_codes = new_items.find('.col-xs-4');
                    let items = new_items.find('.col-xs-8');
                    for (let item of item_codes) {
                        item.classList.remove('col-xs-4')
                        item.classList.add('col-xs-9')
                        item.parentElement.classList.add('modified_item');
                    }
    
                    for (let item of items) {
                        item.classList.remove('col-xs-8')
                        item.classList.add('col-xs-3')
                        item.innerText = item.innerText.split(',')[0];
                    }
                    new_items.show();
                    setTimeout(()=> {
                        clearInterval(interval);
                    },1000)
                }
            }, 0.5);
    
        })
    },
    update_stock: function(frm) {

        if(!frm.doc.update_stock){
            if (frm.doc.items.length){
                if(frm.doc.items[0].warehouse) {
                    frm.toggle_display("set_the_warehouse", false);
                    frm.set_df_property("set_the_warehouse", "reqd", 0);
                }
                else {
                    frm.toggle_display("set_the_warehouse", true);
                    frm.set_df_property("set_the_warehouse", "reqd", 1);   
                }
            }
            
        }
        else {
            frm.toggle_display("set_the_warehouse", false);
            frm.set_df_property("set_the_warehouse", "reqd", 0);
        }
    },
    customer: function(frm){
        if (frm.doc.customer){
            console.log("Customer")
            frappe.call({
                method:"lamsatech_query.events.sales_order.check_branch",
                args:{
                    user : frappe.user.name,
                    customer : frm.doc.customer,
                },
            })
        }
    },
})

frappe.ui.form.on('Sales Invoice Item', {
    item_code:function(frm,cdt,cdn){
        var d = locals[cdt][cdn]

		frappe.call({
			method: "lamsatech_query.events.stock_details.get_last_selling_prices_of_customer",
			args:{
				item_code : d.item_code,
				customer : frm.doc.customer,
				company : frm.doc.company
			},
			callback: function(r) {
                var template = '<div style="width:100%"> <div style="float:left;width:33%"> <table class="table table-condensed table-hover table-bordered"> <tbody> <tr> <th width=20%><b>Selling Price</b></th> <th><b>Date</b></th> <th width=50%><b>Customer</b></th> </tr>{% for (var row in rows) { %} <tr>{% for (var col in rows[row]) { %} <td>{{ rows[row][col] }}</td>{% } %}</tr>{% } %}</tbody> </table> </div> <div style="float:left;width:33%"> <table class="table table-condensed table-hover table-bordered"> <tbody> <tr> <th width=50%><b>Warehouse</b></th> <th><b>Available Qty</b></th> <th><b>Actual Qty</b></th> </tr>{% for (var row in stock_balance) { %} <tr>{% for (var col in stock_balance[row]) { %} <td>{{ stock_balance[row][col] }}</td>{% } %}</tr>{% } %}</tbody> </table> </div> </div>'
                frm.set_df_property('previous_transaction', 'options', frappe.render(template, {rows: r.message.item_price,stock_balance:r.message.stock_balance}));
                frm.refresh_field('previous_transaction');

			}
		});
	}

})

$(document).on('click', ".frappe-control[data-fieldname='items'] .frappe-control[data-fieldname='item_code'] li:last-child", () => {
    let interval = setInterval(() => {
        $('.modal-dialog').hide();
        if (cur_dialog) {
            let item_codes = $('.link-select-row .col-xs-4');
            for (let item of item_codes) {
                item.classList.remove('col-xs-4')
                item.classList.add('col-xs-9')
            }
            let items = $('.link-select-row .col-xs-8');
            for (let item of items) {
                item.classList.remove('col-xs-8')
                item.classList.add('col-xs-3')
                item.innerText = item.innerText.split(',')[0];
            }
            $('.modal-dialog').show();
            cur_frm.events.modify_more_items();
            cur_frm.events.modify_search_items();
            $('.modal-dialog').show();
            setTimeout(()=> {
                clearInterval(interval);
            },1000)
        }
    }, 1); // check every 1ms
});