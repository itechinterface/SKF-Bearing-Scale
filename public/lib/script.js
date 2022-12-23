(function ($, window, document) {

    $(function () {

        if (!$.fn.dataTable) return;

        //
        // Zero configuration
        // 

        $('#datatable1').dataTable({
            'paging': true, // Table pagination
            'ordering': true, // Column ordering 
            'info': true, // Bottom left status text
            // Text translation options
            // Note the required keywords between underscores (e.g _MENU_)
            oLanguage: {
                sSearch: 'Search all columns:',
                sLengthMenu: '_MENU_ records per page',
                info: 'Showing page _PAGE_ of _PAGES_',
                zeroRecords: 'Nothing found - sorry',
                infoEmpty: 'No records available',
                infoFiltered: '(filtered from _MAX_ total records)'
            }
        });


        // 
        // Filtering by Columns
        // 

        var dtInstance2 = $('#datatable2').dataTable({
            'paging': true, // Table pagination
            'ordering': true, // Column ordering 
            'info': true, // Bottom left status text
            // Text translation options
            // Note the required keywords between underscores (e.g _MENU_)
            oLanguage: {
                sSearch: 'Search all columns:',
                sLengthMenu: '_MENU_ records per page',
                info: 'Showing page _PAGE_ of _PAGES_',
                zeroRecords: 'Nothing found - sorry',
                infoEmpty: 'No records available',
                infoFiltered: '(filtered from _MAX_ total records)'
            }
        });
        var inputSearchClass = 'datatable_input_col_search';
        var columnInputs = $('tfoot .' + inputSearchClass);

        // On input keyup trigger filtering
        columnInputs
            .keyup(function () {
                dtInstance2.fnFilter(this.value, columnInputs.index(this));
            });


        // 
        // Column Visibilty Extension
        // 

        var dtInstance3 = $('#datatable3').dataTable({
            'paging': true, // Table pagination
            'ordering': true, // Column ordering 
            'info': true, // Bottom left status text
            // Text translation options
            // Note the required keywords between underscores (e.g _MENU_)
            oLanguage: {
                sSearch: 'Search all columns:',
                sLengthMenu: '_MENU_ records per page',
                info: 'Showing page _PAGE_ of _PAGES_',
                zeroRecords: 'Nothing found - sorry',
                infoEmpty: 'No records available',
                infoFiltered: '(filtered from _MAX_ total records)'
            },
            sDom: 'C<"clear">lfrtip',
            colVis: {
                order: "alfa",
                "buttonText": "Show/Hide Columns"
            }
        });


    });

}(jQuery, window, document));

/**
 * Provides a start point to run plugins and other scripts
 */
(function ($, window, document) {

    $(function () {

        // Bootstrap slider
        $('.slider').slider();
    });
    

    // With JQuery
    $('#ex1, #ex2').slider({
        tooltip: 'always',
        formatter: function(value) {
            return 'Current value: ' + value;
        }
    });


}(jQuery, window, document));

/*(function ($, window, document) {

    $(function () {

        $('[data-toggle="tooltip"]').tooltip({
            container: 'body',
            placement: function (context, source) {
                //return (predictTooltipTop(source) < 0) ?  "bottom": "top";
                var pos = "top";
                if (predictTooltipTop(source) < 0)
                    pos = "bottom";
                if (predictTooltipLeft(source) < 0)
                    pos = "right";
                return pos;
            }
        });

    });

    // Predicts tooltip top position 
    // based on the trigger element
    function predictTooltipTop(el) {
        var top = el.offsetTop;
        var height = 40; // asumes ~40px tooltip height

        while (el.offsetParent) {
            el = el.offsetParent;
            top += el.offsetTop;
        }
        return (top - height) - (window.pageYOffset);
    }

    // Predicts tooltip top position 
    // based on the trigger element
    function predictTooltipLeft(el) {
        var left = el.offsetLeft;
        var width = el.offsetWidth;

        while (el.offsetParent) {
            el = el.offsetParent;
            left += el.offsetLeft;
        }
        return (left - width) - (window.pageXOffset);
    }

}(jQuery, window, document));*/