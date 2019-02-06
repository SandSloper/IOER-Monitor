const dev_chart={
    chart_compare_selector:"#dev_chart_compare",
    chart_selector:"#dev_chart",
    endpoint_id:"entwicklungsdiagramm_content",
    text:{
        de:{
            title:{
                false:"Wertentwicklung",
                true:"Entwicklungsvergleich"
            },
            info:"Dieses Diagramm stellt die Entwicklung der Indikatoren dar.",
            indicator:"verfügbare Indikatoren",
            choice:"Bitte wählen.....",
            no_choice:"Kein Indikator gewählt",
            load:"Lädt Diagramm......",
            pnt:"alle Stützpunkte",
            trend:"Prognosewerte",
            unit:"Einheit",
            chart:"Entwicklungsdiagramm für Gebietseinheit"
        },
        en:{
            title:"Trend chart",
            info:"This diagram represents the trend of the indicators.",
            indicator:"available indicators",
            choice:"Please choose.....",
            no_choice:"No indicator selected",
            load:"Loading diagram ......",
            pnt: "all base points",
            trend:"Forecast values",
            unit:"Unit",
            chart:"Development diagram for territorial unit"
        }
    },
    init:function(){
        if(raeumliche_visualisierung.getRaeumlicheGliederung()==="raster"){
            helper.disableElement(this.chart_selector,"vergleichen Sie 2 Indikatoren oder Zeitschnitte miteinander");
            helper.disableElement(this.chart_compare_selector,"vergleichen Sie 2 Indikatoren oder Zeitschnitte miteinander");
        }else{
            helper.enableElement(this.chart_selector,$(this.chart_selector).data("title"));
            helper.enableElement(this.chart_compare_selector,$(this.chart_compare_selector).data("title"));
        }
        this.controller.set();
    },
    open:function(){
        let lan = language_manager.getLanguage(),
            html = he.encode(`
            <div class="jq_dialog" id="${this.endpoint_id}">
                <div class="container">
                    <h4>${this.text[lan].info}</h4>
                    <div id="diagramm_options">
                        <div id="indikator_choice_container_diagramm">
                            <div>${this.text[lan].indicator}</div>
                            <div id="indicator_ddm_diagramm" class="ui selection multiple dropdown">
                                <i class="dropdown icon"></i>
                                <a id="default_diagramm_choice" class="ui label transition visible" style="display: inline-block !important;"></i></a>
                                <div class="default text">${this.text[lan].choice}</div>
                                <div  id="kat_auswahl_diagramm" class="menu"></div>
                            </div>
                        </div>
                        <div id="diagramm_export">
                            <div title="Diagramm herunterladen">Download:</div>
                            <div id="digramm_export_container">
                                <div id="diagramm_download_format_choice" class="ui compact selection dropdown">
                                    <i class="dropdown icon"></i>
                                    <div class="default text">${this.text[lan].choice}</div>
                                    <div class="menu">
                                        <div class="item" data-format="png">PNG</div>
                                        <div class="item" data-format="pdf">PDF</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="diagramm_choices">
                            <div id="digramm_choices_container">
                                <div class="checkboxes">
                                    <label>
                                        <input type="checkbox" value="" id="alle_stpkt">${this.text[lan].pnt}
                                    </label>
                                    <label id="prognose_container">
                                        <input type="checkbox" value="" id="prognose">${this.text[lan].trend}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="diagramm_info_text">
                        <div>${this.text[lan].chart}: <b id="diagramm_gebietsname"></b><span id="diagramm_ags"></span> in <b id="diagrmm_gebiets_typ"></b>.</div>
                    </div>
                    <div id="container_diagramm" class="container_diagramm">
                        <div id="diagramm">
                            <h3 class="Hinweis_diagramm" id="Hinweis_diagramm_empty">${this.text[lan].no_choice}</h3>
                            <h3 class="Hinweis_diagramm" id="diagramm_loading_info">Lädt Diagramm......</h3>
                            <svg id="visualisation" height="100"></svg>
                        </div>
                        <div id="tooltip"></div>
                    </div>
                </div>
                </div>
            </div>
        `);
        //settings for the manager
        dialog_manager.instructions.endpoint = `${this.endpoint_id}`;
        dialog_manager.instructions.html= html;
        dialog_manager.instructions.title=dev_chart.text[lan].title[this.chart.settings.ind_vergleich];
        dialog_manager.instructions.modal=false;
        dialog_manager.create();
        this.chart.create();

    },
    chart:{
        settings:{
            ags:"",
            ind:"",
            name:"",
            ind_vergleich:false,
            state_stueztpnt : true,
            state_prognose :false
        },
        ind_array_chart:[],
        merge_data:[],
        init:function(){
            const chart = this;
            let svg = d3.select("#visualisation"),
                array = chart.ind_array_chart,
                diagram = $('#diagramm'),
                margin = {top: 20, right: 60, bottom: 30, left: 60},
                chart_width = diagram.width() - margin.left - margin.right,
                chart_height = 400 - (array.length * 30);

            //let chart_height = $('.ui-dialog').height()*(1.5/3);
            let x = d3.scaleTime().range([0, chart_width]),
                y = d3.scaleLinear().range([chart_height, 0]);

            //show loading info
            $('#diagramm_loading_info').show();

            if (array.length == 0) {
                $('#visualisation').hide();
                $('#Hinweis_diagramm_empty').show();
            } else {
                //clean the chart
                $('#visualisation').show().empty();
                //remove the tip if shown
                $('#Hinweis_diagramm_empty').hide();
            }

            //set dynamic the chart dimensions
            diagram.css("height", $('#entwicklungsdiagramm_content').height() - $('#diagramm_options').height() - 70 + (array.length * 30));
            //clean the legend
            $('.legende_single_part_container').remove();

            let g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            let line = d3.line()
                .x(function (d) {
                    return x(d.date);
                })
                .y(function (d) {
                    return y(d.value);
                });

            let legend = svg.append("g")
                .attr("class", "legend");

            let def = $.Deferred();

            //create the call
            function defCalls() {
                let requests = [],
                    settings = {
                        "forecast":chart.settings.state_prognose.toString(),
                        "all_points":chart.settings.state_stueztpnt.toString(),
                        "compare":chart.settings.ind_vergleich.toString()
                    };
                $.each(array, function (key, value) {
                    requests.push(request_manager.getTrendValues(value.id,chart.settings.ags.toString(),settings));
                });
                $.when.apply($, requests).done(function () {
                    def.resolve(arguments);
                });
                return def.promise();
            }

            defCalls().done(function (arr) {
                chart.merge_data = [];
                let i = 0;
                $.each(array, function (key, val) {
                    let obj = {"id": val.id, "values": arr[i][0]};
                    if (array.length == 1) {
                        obj = {"id": val.id, "values": arr[0]};
                    }
                    chart.merge_data.push(obj);
                    i++;
                });
                $('#diagramm_loading_info').hide();
                scaleChart();
                createPath();
            });

            function scaleChart() {
                let data = [];
                $.each(chart.merge_data, function (key, value) {
                    $.each(value.values, function (x, y) {
                        data.push({"year": y.year, "value": y.value, "real_value": y.real_value});
                    })
                });
                let minYear = helper.getMinArray(data, "year"),
                    maxYear = helper.getMaxArray(data, "year"),
                    maxValue = parseInt(Math.round(helper.getMaxArray(data, "value")) + 1),
                    minValue = parseInt(Math.round(helper.getMinArray(data, "value")) - 1),
                    min_date = new Date(minYear - 1, 0, 1),
                    max_date = new Date(maxYear + 1, 0, 1),
                    current_year = helper.getCurrentYear();
                //reset max year if prognose is unset
                if (!chart.settings.state_prognose) {
                    max_date = new Date(current_year + 2, 0, 1);
                }
                if (minYear== maxYear) {
                    x.domain(d3.extent([new Date(maxYear - 5, 0, 1), max_date]));
                } else {
                    x.domain(d3.extent([min_date, max_date]));
                }

                y.domain(d3.extent([minValue, maxValue]));


                g.append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + chart_height + ")")
                    .call(d3.axisBottom(x).scale(x).ticks(10).tickFormat(function(d){
                        if(chart.settings.state_prognose){
                            if(d.getFullYear() <= helper.getCurrentYear()){
                                return d.getFullYear();
                            }
                        }else{
                            return d.getFullYear();
                        }
                    }));

                g.append("g")
                    .attr("class", "axis axis--y")
                    .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) {
                        if (chart.settings.ind_vergleich) {
                            if (d == 0) {
                                if (array.length== 1) {
                                    return data[0].real_value;
                                } else {
                                    return 'x';
                                }
                            }
                            else if (d != minValue || d != maxValue) {
                                return d;
                            }
                        } else {
                            return d;
                        }
                    }))
                    .append("text")
                    .attr("class", "axis-title")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .attr("fill", "#4E60AA");
            }

            //fill the path values
            function createPath() {
                $.each(chart.merge_data, function (key, value) {
                    let data = value.values;
                    parseTime(data);
                    appendData(data, data[0].color.toString());
                    createCircle(data, data[0].color.toString());
                    setLegende(data, data[0].color.toString());
                });
            }

            //add the data
            function appendData(data, color) {
                let color_set = color;
                g.append("path")
                    .data(data)
                    .attr("class", "path_line")
                    .attr("id", data[0].id + "_path")
                    .attr('stroke', color_set)
                    .attr("stroke-dasharray", ("7, 3"))
                    .attr("fill", "none")
                    .attr("d", line(data));
            }

            let margin_top = 0;

            function setLegende(data, color) {
                legend.append('g')
                    .append("rect")
                    .attr("x", margin.left)
                    .attr("y", chart_height + 50 + margin_top)
                    .attr("width", 10)
                    .attr("height", 10)
                    .style("fill", color);

                legend.append("text")
                    .attr("x", margin.left + 30)
                    .attr("y", chart_height + 60 + margin_top)
                    .attr("height", 30)
                    .attr("width", chart_width)
                    .style("fill", color)
                    .text(data[0].name + ' in ' + data[0].einheit);

                margin_top += 20;
            }

            function createCircle(data, color) {
                let color_set = color;
                let format_month = d3.timeFormat("%m");
                let format_year = d3.timeFormat("%Y");
                for (let i = 0; i < data.length; i++) {
                    let circle = g.append("g");
                    circle.append("circle")
                        .attr("class", data[0].id + "_circle circle")
                        .attr("r", 5.5)
                        .attr("data-value", data[i].value)
                        .attr('fill', function () {
                            if (data[i].year > (new Date).getFullYear()) {
                                return 'white';
                            } else {
                                return color_set;
                            }
                        })
                        .attr('stroke', color_set)
                        .attr("data-realvalue", data[i].real_value)
                        .attr("data-date", format_month(data[i].date) + "_" + format_year(data[i].date))
                        .attr("data-date_d3", data[i].date)
                        .attr("data-name", data[i].name)
                        .attr("data-ind", data[i].id)
                        .attr("data-year", data[i].year)
                        .attr("data-month", data[i].month)
                        .attr("data-einheit", data[i].einheit)
                        .attr("data-color", color_set)
                        .attr("transform", "translate(" + x(data[i].date) + "," + y(data[i].value) + ")");
                }
                //bind the mouseover events
                $('.circle').on("mouseover",function(){
                    chart.controller.handleMouseOver($(this));
                })
                    .on("mouseout",function(){
                        chart.controller.handleMouseOut($(this));
                    });
            }

            function parseTime(data) {
                let parseTime = d3.timeParse("%m/%Y");
                // format the data
                data.forEach(function (d) {
                    d.date = parseTime(d.date);
                    d.value = +d.value;
                });
                return data;
            }
        },
        create:function(){
            const chart = dev_chart.chart;
            let selector = $(`#${dev_chart.endpoint_id}`);
            chart.controller.clearChartArray();
            $('#default_diagramm_choice').text(indikatorauswahl.getSelectedIndikatorText());
            if(chart.settings.ind_vergleich) {
                $('#indikator_choice_container_diagramm').show();
                if (chart.ind_array_chart.length==0) {
                    let kat_auswahl_diagramm =$('#kat_auswahl_diagramm');
                    indikatorauswahl.cloneMenu('kat_auswahl_diagramm', 'link_kat_diagramm', 'right',['X'],false);
                    //remove items which have not the simular unit
                    $('#indicator_ddm_diagramm .submenu .item').each(function(){
                        if(indikatorauswahl.getIndikatorEinheit() !== $(this).data('einheit')){
                            $(this).remove();
                        }
                    });
                    //clear empty categories
                    $('.link_kat_diagramm').each(function(){
                        let test = ($(this).find('.item').text()).replace(/\s+/g, '');
                        if(parseInt(test.length)<=2 && $.isNumeric(test.length)){
                            $(this).remove();
                        }
                    });
                    kat_auswahl_diagramm.find('.item').each(function(){$(this).css("color","rgba(0,0,0,.87)")});
                    //remove selected Indicatopr from the list
                    kat_auswahl_diagramm.find("#"+indikatorauswahl.getSelectedIndikator()+"_item").remove();
                    chart.ind_array_chart.push({"id": chart.settings.ind});
                }
            }else{
                selector.find('#indikator_choice_container_diagramm').remove();
                chart.ind_array_chart.push({"id": chart.settings.ind});
            }
            chart.controller.set();
            chart.init();
        },
        controller:{
            set:function(){
                const chart = dev_chart.chart;
                let ind_auswahl = $('#indicator_ddm_diagramm'),
                    download = $('#diagramm_download_format_choice');
                //set the info text
                $("#diagramm_gebietsname").text(chart.settings.name);
                $('#diagramm_ags').text(" (" + chart.settings.ags + ")");
                $('#diagrmm_gebiets_typ').text(" "+indikatorauswahl.getIndikatorEinheit());
                //set the selcted value
                ind_auswahl
                    .dropdown({
                        'maxSelections': 2,
                        onAdd: function (addedValue, addedText, $addedChoice) {
                            chart.ind_array_chart.push({"id": addedValue});
                            chart.init();
                            $(this).blur();
                        },
                        onLabelRemove: function (value) {
                            chart.ind_array_chart = helper.removefromarray(chart.ind_array_chart, value);
                            chart.init();
                        }
                    });

                setTimeout(function(){
                    ind_auswahl.dropdown("hide");
                },500);

                //options-------------------------
                //1. alle Stützpkt
                $('#alle_stpkt')
                    .prop('checked', false)
                    .change(function(){
                        if (this.checked) {
                            chart.settings.state_stueztpnt = false;
                            chart.init();
                        }else{
                            chart.settings.state_stueztpnt = true;
                            chart.init();
                        }
                    });
                if($.inArray(2025,indikatorauswahl.getAllPossibleYears())!==-1){
                    $('#prognose_container').show();
                }else{
                    $('#prognose_container').hide();
                }
                //2. Prognose
                $('#prognose')
                    .prop('checked', false)
                    .change(function(){
                        if (this.checked) {
                            chart.settings.state_prognose = true;
                            chart.init();
                        }else{
                            chart.settings.state_prognose = false;
                            chart.init();
                        }
                    });
                download
                    .dropdown({
                        onChange: function (value, text, $choice) {
                            let container = $('#visualisation'),
                                width = container.width(),
                                height = container.height();
                            //workaround for firefox Bug
                            container.attr("height",height).attr("width",width);
                            $(this).blur();
                            if (value === 'png') {
                                svgString2Image(width, height, '.container_diagramm #diagramm svg', saveIMAGE);
                            } else if (value === 'pdf') {
                                svgString2DataURL(width, height, '.container_diagramm #diagramm svg',savePDF);
                            }
                        }
                    });
                setTimeout(function(){
                    download.dropdown("hide");
                },500);
            },
            // Create Event Handlers for mouse
            handleMouseOver:function(elem) {
                const chart = dev_chart.chart;
                elem.attr("r",7.5);
                console.log(elem.data("ind"));
                let ind = elem.data('ind'),
                    year = elem.data('year'),
                    month = elem.data('month'),
                    value = elem.data('value'),
                    real_value = elem.data('realvalue'),
                    color = elem.data('color'),
                    einheit = elem.data('einheit'),
                    x = elem.position().left-document.getElementById('visualisation').getBoundingClientRect().x +10,
                    y = elem.position().top-document.getElementById('visualisation').getBoundingClientRect().y + 80,
                    html = '',
                    text_value = "Wert: " + real_value + " "+einheit;
                //the tooltip for ind vergleich
                if (dev_chart.chart.settings.ind_vergleich) {
                    let data = [],
                        ind_before = function(merge_data,ind,year){
                            let array = [];
                            for (let i = 0; i <merge_data.length; i++) {
                                if (merge_data[i].id === ind) {
                                    array.push(merge_data[i])
                                }
                            }
                            for (let i = 0; i < array.length; i++) {
                                if (array[i].id === ind) {
                                    if (array[i].year == year) {
                                        return i - 1;
                                    }
                                }
                            }
                        };
                    $.each(chart.merge_data,function(x,y){
                        if (y.id === ind) {
                            data.push(y.values);
                        }
                    });
                    //check if the oldest year is hover
                    let index = ind_before(data[0],ind, year);
                    if (index == -1) {
                        html = text_value + "<br/>" + "Stand: " + month + "/" + year;
                    } else {
                        //the text part
                        let date_before = "von " + data[0][index].month + "/" +data[0][index].year + " bis " + month + "/" + year;
                        let text_value_dev = "Entwicklung: " + (value - data[0][index].value).toFixed(2) + " "+einheit;
                        html = text_value + "<br/>" + text_value_dev + "<br/>" + date_before;
                    }
                } else {
                    html = text_value + "<br/> Stand: " + month + "/" + year;
                }

                $('#tooltip')
                    .html(html)
                    .css({"left": x, "top": y, "color": color, "border": "1px solid" + color})
                    .show();
            },
            handleMouseOut:function(elem) {
                elem.attr("r", 5.5);
                $('#tooltip').hide();
            },
            clear:function(){
                $('#visualisation').empty();
                $("#diagramm_gebietsname").empty();
                $('#diagramm_ags').empty();
                $('#diagrmm_gebiets_typ').empty();
            },
            clearChartArray:function(){
                dev_chart.chart.ind_array_chart = [];
                dev_chart.chart.merge_data = [];
            }
        }
    },
    controller:{
        set:function(){
                let chart_array = [],
                    id_input="search_ags",
                    set_autocomplete = function () {
                        chart_array = indikator_json_group.getAGSArray();
                        auto_complete.autocomplete(document.getElementById(id_input), chart_array);
                    },
                    get_ags=function(){
                        return $(`#${id_input}`).data("id");
                    },
                    get_name=function(){
                        return $(`#${id_input}`).val();
                    },
                    set_swal=function(callback){
                        swal({
                            title: `Bitte wählen Sie ein/en ${base_raumgliederung.getBaseRaumgliederungText(true)}`,
                            text: `<div class="form-group" style="display: unset !important;">
                                <input type="text" id="${id_input}" class="form-control" tabindex="3" placeholder="Gebiet...">
                           </div>`,
                            showCancelButton: true,
                            cancelButtonText: "Abbrechen",
                            html: true
                        }, function (isConfirm) {
                            if (isConfirm) {
                                callback();
                            }

                        });
                        set_autocomplete();
                    };
                //call on select inside the toolbar
                $(document).on("click", dev_chart.chart_selector, function () {
                    let callback = function () {
                        if(get_ags()) {
                            dev_chart.chart.settings.ags = get_ags();
                            dev_chart.chart.settings.name = get_name();
                            dev_chart.chart.settings.ind = indikatorauswahl.getSelectedIndikator();
                            dev_chart.chart.settings.ind_vergleich = false;
                            dev_chart.open();
                        }
                    };
                    try {
                        set_swal(callback);
                    }catch(err){
                       alert_manager.alertError();
                    }
                });

            $(document).on("click", dev_chart.chart_compare_selector, function () {
                let callback = function () {
                    if(get_ags()) {
                        dev_chart.chart.settings.ags = get_ags();
                        dev_chart.chart.settings.name = get_name();
                        dev_chart.chart.settings.ind = indikatorauswahl.getSelectedIndikator();
                        dev_chart.chart.settings.ind_vergleich = true;
                        dev_chart.open();
                    }
                };
                try {
                    set_swal(callback);
                }catch(err){
                    alert_manager.alertError();
                }
            });
        }
    }
};

